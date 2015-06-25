var Plugin = require('./Plugin');
var basename = require('path').basename;
var join = require('path').join;

function PluginApi(kibana, pluginPath) {
  this.rootDir = kibana.rootDir;
  this.package = require(join(pluginPath, 'package.json'));
  this.Plugin = Plugin.scoped(kibana, pluginPath, this.package);
}

module.exports = PluginApi;
