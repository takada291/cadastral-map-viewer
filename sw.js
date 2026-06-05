const CACHE_NAME = 'forestry-map-pwa-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.9.2/proj4.js'
];

// インストール時に基本アセットをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 通信フェッチ時のキャッシュ戦略（Cache-First ＋ 地理院地図タイルの動的キャッシュ）
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 地理院地図タイルまたはCDNライブラリの場合は、一度読み込んだらローカルに強制保存
  if (url.includes('cyberjapandata.gsi.go.jp') || url.includes('unpkg.com') || url.includes('cdnjs.cloudflare.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response) return response; // キャッシュがあればそれを返す

          return fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone()); // 新しく取得したタイルをキャッシュに保存
            return networkResponse;
          }).catch(() => {
            // オフラインでタイルがない場合は何も返さない（白地図になる）
            return new Response('');
          });
        });
      })
    );
  } else {
    // 通常のアセットはキャッシュにあれば返し、なければ通信
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});