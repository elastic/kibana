module.exports = function (kibana, server) {
  var _ = require('lodash');
  var Config = require('./config');
  var schema = require('./schema');

  var settings = kibana.settings;

  server.decorate('server', 'config', _.constant(new Config(schema, settings)));
};
