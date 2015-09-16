let _ = require('lodash');
let Plugin = require('./Plugin');
let { basename, join } = require('path');

module.exports = class PluginApi {
  constructor(kibana, pluginPath) {
    this.config = kibana.config;
    this.rootDir = kibana.rootDir;
    this.package = require(join(pluginPath, 'package.json'));
    this.autoload = require('../../ui/autoload');
    this.Plugin = Plugin.scoped(kibana, pluginPath, this.package);
  }

  get uiExports() {
    throw new Error('plugin.uiExports is not defined until initialize phase');
  }
};
