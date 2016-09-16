
import PluginApi from './plugin_api';
import { inspect } from 'util';
import { get, indexBy } from 'lodash';
import toPath from 'lodash/internal/toPath';
import Collection from '../../utils/collection';

let byIdCache = Symbol('byIdCache');
let pluginApis = Symbol('pluginApis');

async function addPluginConfig(pluginCollection, plugin) {
  const configSchema = await plugin.getConfigSchema();
  let { config } = pluginCollection.kbnServer;
  config.extendSchema(plugin.configPrefix, configSchema);
}

function removePluginConfig(pluginCollection, plugin) {
  let { config } = pluginCollection.kbnServer;
  config.removeSchema(plugin.configPrefix);
}

module.exports = class Plugins extends Collection {

  constructor(kbnServer) {
    super();
    this.kbnServer = kbnServer;
    this[pluginApis] = new Set();
  }

  async new(path) {
    let api = new PluginApi(this.kbnServer, path);
    this[pluginApis].add(api);

    let output = [].concat(require(path)(api) || []);
    let config = this.kbnServer.config;

    if (!output.length) return;

    // clear the byIdCache
    this[byIdCache] = null;

    for (let plugin of output) {
      if (!plugin instanceof api.Plugin) {
        throw new TypeError('unexpected plugin export ' + inspect(plugin));
      }

      await addPluginConfig(this, plugin);
      this.add(plugin);
    }
  }

  async disable(plugin) {
    removePluginConfig(this, plugin);
    this.delete(plugin);
  }

  get byId() {
    return this[byIdCache] || (this[byIdCache] = indexBy([...this], 'id'));
  }

  getPluginApis() {
    return this[pluginApis];
  }

};
