import Plugin from './plugin';
import { join } from 'path';

module.exports = class PluginApi {
  constructor(kibana, pluginPath) {
    this.config = kibana.config;
    this.rootDir = kibana.rootDir;
    this.package = require(join(pluginPath, 'package.json'));
    this.Plugin = Plugin.scoped(kibana, pluginPath, this.package);
  }

  get uiExports() {
    throw new Error('plugin.uiExports is not defined until initialize phase');
  }

  get autoload() {
    console.warn(
      `${this.package.id} accessed the autoload lists which are no longer available via the Plugin API.` +
      'Use the `ui/autoload/*` modules instead.'
    );

    return {
      directives: [],
      filters: [],
      styles: [],
      modules: [],
      require: []
    };
  }
};
