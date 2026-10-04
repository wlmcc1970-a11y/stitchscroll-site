/* Stitch Scroll service worker. DigiRune Studios.
   App pages: network first, cached copy when offline, so counting works with no signal.
   Icons and install files are precached. Requests to other sites (sign-in, sync, the scan server)
   are never touched: they always go straight to the network. Page photos live in the app's own
   device storage, not in this cache. */
'use strict';
const CACHE = 'stitch-scroll-v1.0.0-6301ce7c32';
const SHELL = ["./","index.html","manifest.json","privacy.html","delete-account.html","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-192.png","icons/icon-maskable-512.png","icons/apple-touch-icon-180.png","printables/pdf/crochet-abbreviations-a4.pdf","printables/pdf/crochet-abbreviations-letter.pdf","printables/pdf/hook-and-needle-sizes-a4.pdf","printables/pdf/hook-and-needle-sizes-letter.pdf","printables/pdf/knitting-abbreviations-a4.pdf","printables/pdf/knitting-abbreviations-letter.pdf","printables/pdf/row-counter-tracker-a4.pdf","printables/pdf/row-counter-tracker-letter.pdf","printables/pdf/us-uk-crochet-terms-a4.pdf","printables/pdf/us-uk-crochet-terms-letter.pdf","printables/pdf/yarn-weight-chart-a4.pdf","printables/pdf/yarn-weight-chart-letter.pdf"];
const APP_PAGES = ['', 'index.html', 'privacy.html', 'delete-account.html'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('stitch-scroll-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (event) => { if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting(); });
const scopePath = () => new URL(self.registration.scope).pathname;
const appRelative = (url) => (url.pathname.startsWith(scopePath()) ? url.pathname.slice(scopePath().length) : null);
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const rel = appRelative(url);
  if (rel === null) return;
  if (req.mode === 'navigate') {
    if (!APP_PAGES.includes(rel)) return;
    const isApp = rel === '' || rel === 'index.html';
    event.respondWith(fetch(req).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(isApp ? 'index.html' : req, copy)); }
      return res;
    }).catch(() => caches.open(CACHE).then((c) => c.match(isApp ? 'index.html' : req, { ignoreSearch: true }).then((hit) => hit || c.match('index.html')))));
    return;
  }
  if (!SHELL.includes(rel)) return;
  event.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
    if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => new Response('', { status: 504, statusText: 'Offline' }))));
});
