var _ = require('lodash');
var glob = require('glob');
var path = require('path');

var plugins = function (dir) {
  if (!dir) return [];
  var files = glob.sync(path.join(dir, '*', 'index.js')) || [];
  return files.map(function (file) {
    return file.replace(dir, 'plugins').replace(/\.js$/, '');
  });
};

var cache;

module.exports = function (config) {
  if (!cache) {
    var bundled_plugin_ids = config.get('kibana.bundledPluginIds') || [];
    var bundled_plugins = plugins(config.get('kibana.bundledPluginsFolder'));
    var external_plugins = plugins(config.get('kibana.externalPluginsFolder'));
    cache = bundled_plugin_ids.concat(bundled_plugins, external_plugins);
  }
  return cache;
};

