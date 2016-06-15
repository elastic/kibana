import _ from 'lodash';
import states from './states';
import Status from './status';

class PluginStatus extends Status {
  constructor(plugin, server) {
    super(`plugin:${plugin.id}@${plugin.version}`, server);
    this.plugin = plugin;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      plugin: {
        id: this.plugin.id,
        version: this.plugin.version
      }
    };
  }
}

module.exports = PluginStatus;
