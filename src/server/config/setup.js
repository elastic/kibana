module.exports = function (kbnServer, server) {
  let Config = require('./Config');
  let schema = require('./schema');

  kbnServer.config = new Config(schema, kbnServer.settings || {});
  server.decorate('server', 'config', function () {
    return kbnServer.config;
  });
};
