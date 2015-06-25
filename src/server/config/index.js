var _ = require('lodash');
var Config = require('./config');
var schema = require('./schema');

module.exports = function (kibana) {
  var server = kibana.server;
  var settings = kibana.settings;

  server.decorate('server', 'config', _.constant(new Config(schema, settings)));
};
