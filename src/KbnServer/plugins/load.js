var Promise = require('bluebird');
var PluginApi = require('./PluginApi');

module.exports = function (kibana, pluginPaths) {
  return Promise.map(pluginPaths, function (pluginPath) {
    return require(pluginPath)(new PluginApi(kibana, pluginPath)).init();
  });
};
