var Promise = require('bluebird');
var registerPlugins = require('./register_plugins');
var requirePlugins = require('./require_plugins');
var logging = require('../logging/');
var registerPluginConfigs = require('./register_plugin_configs');

module.exports = function (externalPlugins) {
  // require all the internal plugins then concat witht the external
  // plugins passed in from the start method.
  var plugins = requirePlugins().concat(externalPlugins);
  // setup logging then register the plugins
  return logging(this)
  // Setup the config schema for the plugins
  .then(function (server) {
    return registerPluginConfigs(server, plugins);
  })
  // Register the plugins
  .then(function (server) {
    return registerPlugins(server, plugins);
  });
};
