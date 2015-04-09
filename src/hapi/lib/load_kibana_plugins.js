var _ = require('lodash');
var Promise = require('bluebird');
var registerPlugins = require('./register_plugins');
var requirePlugins = require('./require_plugins');
var setupLogging = require('./setup_logging');
module.exports = function (externalPlugins) {
  var plugins = requirePlugins().concat(externalPlugins);
  return setupLogging(this).then(function (server) {
    registerPlugins(server, plugins);
  });
};
