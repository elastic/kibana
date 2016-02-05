
import PluginApi from './PluginApi';
import Plugin from './Plugin';
import { inspect } from 'util';
import { get, indexBy } from 'lodash';
import { join } from 'path';
let Collection = require('requirefrom')('src')('utils/Collection');

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

  async newFromPackageJson(path) {
    const pkgPath = join(path, 'package.json');
    const pkg = require(pkgPath);
    if (!pkg.kibana) throw new Error('package.json does not have a kibana section');
    if (!pkg.kibana.plugin) throw new Error('package.json does not define a plugin');

    this.add(new Plugin(this.kbnServer, pkgPath, pkg, pkg.kibana.plugin));
  }

  get byId() {
    return this[byIdCache] || (this[byIdCache] = indexBy([...this], 'id'));
  }

  getPluginApis() {
    return this[pluginApis];
  }

};
