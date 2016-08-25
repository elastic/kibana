export default function (kbnServer, server, config) {

  server.decorate('server', 'config', function () {
    return kbnServer.config;
  });

  const tmpl = 'Settings for "<%= key %>" were not applied, check for spelling errors and ensure the plugin is loaded.';
  for (const [key, val] of config.getPendingSets()) {
    server.log(['warning', 'config'], { key, val, tmpl });
  }
};
