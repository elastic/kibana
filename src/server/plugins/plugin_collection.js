
import PluginApi from './plugin_api';
import { inspect } from 'util';
import { get, indexBy } from 'lodash';
import Collection from '../../utils/collection';

let byIdCache = Symbol('byIdCache');
let pluginApis = Symbol('pluginApis');

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

    for (let product of output) {

      if (product instanceof api.Plugin) {
        let plugin = product;
        this.add(plugin);

        let enabled = await plugin.readConfig();
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
