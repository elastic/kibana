var Promise = require('bluebird');
var PluginApi = require('./PluginApi');

module.exports = function (kbnServer, pluginPaths) {
  return Promise.map(pluginPaths, function (pluginPath) {
    return require(pluginPath)(new PluginApi(kbnServer, pluginPath)).init();
  });
};
