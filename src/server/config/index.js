module.exports = function (kbnServer, server) {
  var _ = require('lodash');
  var Config = require('./config');
  var schema = require('./schema');

  var settings = kbnServer.settings;

  server.decorate('server', 'config', _.constant(new Config(schema, settings)));
};
