export default function registerManifest(server) {
  server.route({
    path: '/ui/favicons/manifest.json',
    config: {
      auth: false,
    },
    method: 'GET',
    handler: function (request, reply) {
      const basePath = server.config().get('server.basePath');

      // Return web app manifest, which provides information about web app, e.g. favicon.
      reply(JSON.stringify({
        name: 'Kibana',
        icons: [
          {
            src: `${basePath}/ui/favicons/android-chrome-192x192.png`,
            sizes: '192x192',
            type: 'image/png'
          }
        ],
        theme_color: '#e8488b',
        display: 'standalone',
      }
      )).type('application/json');
    }
  });
}
