
import PluginApi from './plugin_api';
import { inspect } from 'util';
import { get, indexBy } from 'lodash';
import toPath from 'lodash/internal/toPath';
import Collection from '../../utils/collection';

let byIdCache = Symbol('byIdCache');
let pluginApis = Symbol('pluginApis');

async function addPluginConfig(pluginCollection, plugin) {
  const configSchema = await plugin.readConfigSchema();
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

      await this.add(plugin);
      if (!plugin.enabled) this.delete(plugin);
    }
  }

  async add(plugin) {
    await addPluginConfig(this, plugin);
    super.add(plugin);
  }

  delete(plugin) {
    removePluginConfig(this, plugin);
    super.delete(plugin);
  }

  get byId() {
    return this[byIdCache] || (this[byIdCache] = indexBy([...this], 'id'));
  }

  getPluginApis() {
    return this[pluginApis];
  }

};
