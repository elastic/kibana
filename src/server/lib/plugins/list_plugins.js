var _ = require('lodash');
var glob = require('glob');
var path = require('path');

var plugins = function (dir) {
  if (!dir) return [];
  var files = glob.sync(path.join(dir, '*', 'index.js')) || [];
  return files.map(function (file) {
    dir = dir.replace(/\\/g, '/');
    return file.replace(dir, 'plugins').replace(/\.js$/, '');
  });
};

var cache;

module.exports = function (server) {
  var config = server.config();
  if (!cache) {
    var bundled_plugin_ids = config.get('kibana.bundledPluginIds') || [];
    var bundled_plugins = plugins(config.get('kibana.bundledPluginsFolder'));
    var external_plugins = _(server.plugins).map(function (plugin, name) {
      return plugin.self && plugin.self.publicPlugins || [];
    }).flatten().value();
    cache = bundled_plugin_ids.concat(bundled_plugins, external_plugins);
  }
  return cache;
};