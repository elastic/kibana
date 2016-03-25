export default function (kbnServer, server, config) {

  server.decorate('server', 'config', function () {
    return kbnServer.config;
  });

  let tmpl = 'Settings for "<%= key %>" were not applied, check for spelling errors and ensure the plugin is loaded.';
  for (let [key, val] of config.getPendingSets()) {
    server.log(['warning', 'config'], { key, val, tmpl });
  }
};
