
import PluginApi from './plugin_api';
import { inspect } from 'util';
import {indexBy} from 'lodash';
import Collection from '../../utils/collection';

const byIdCache = Symbol('byIdCache');
const pluginApis = Symbol('pluginApis');

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

    if (!output.length) return;

    // clear the byIdCache
    this[byIdCache] = null;

    for (const product of output) {

      if (product instanceof api.Plugin) {
        const plugin = product;
        this.add(plugin);

        const enabled = await plugin.readConfig();
        if (!enabled) this.delete(plugin);
        continue;
      }

      throw new TypeError('unexpected plugin export ' + inspect(product));
    }
  }

  get byId() {
    return this[byIdCache] || (this[byIdCache] = indexBy([...this], 'id'));
  }

  getPluginApis() {
    return this[pluginApis];
  }

};
