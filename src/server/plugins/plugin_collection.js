
import PluginApi from './plugin_api';
import { inspect } from 'util';
import { get, indexBy } from 'lodash';
import toPath from 'lodash/internal/toPath';
import Collection from '../../utils/collection';
import { transformDeprecations } from '../config/transform_deprecations';
import { createTransform } from '../../deprecation';

const byIdCache = Symbol('byIdCache');
const pluginApis = Symbol('pluginApis');

async function addPluginConfig(pluginCollection, plugin) {
  const { config, server, settings } = pluginCollection.kbnServer;

  const transformedSettings = transformDeprecations(settings);
  const pluginSettings = get(transformedSettings, plugin.configPrefix);
  const deprecations = plugin.getDeprecations();
  const transformedPluginSettings = createTransform(deprecations)(pluginSettings, (message) => {
    server.log(['warning', plugin.configPrefix, 'config', 'deprecation'], message);
  });

  const configSchema = await plugin.getConfigSchema();
  config.extendSchema(configSchema, transformedPluginSettings, plugin.configPrefix);
}

module.exports = class Plugins extends Collection {

  constructor(kbnServer) {
    super();
    this.kbnServer = kbnServer;
    this[pluginApis] = new Set();
  }

  async new(path) {
    const api = new PluginApi(this.kbnServer, path);
    this[pluginApis].add(api);

    const output = [].concat(require(path)(api) || []);
    const config = this.kbnServer.config;

    if (!output.length) return;

    // clear the byIdCache
    this[byIdCache] = null;

    for (const plugin of output) {
      if (!plugin instanceof api.Plugin) {
        throw new TypeError('unexpected plugin export ' + inspect(plugin));
      }

      await addPluginConfig(this, plugin);
      this.add(plugin);
    }
  }

  async disable(plugin) {
    this.delete(plugin);
  }

  get byId() {
    return this[byIdCache] || (this[byIdCache] = indexBy([...this], 'id'));
  }

  getPluginApis() {
    return this[pluginApis];
  }

};
