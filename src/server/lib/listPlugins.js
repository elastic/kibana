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

module.exports = function (config) {
  var bundled_plugin_ids = config.kibana.bundled_plugin_ids || [];
  var bundled_plugins = plugins(config.bundled_plugins_folder);
  var external_plugins = plugins(config.external_plugins_folder);
  return bundled_plugin_ids.concat(bundled_plugins, external_plugins);
};

