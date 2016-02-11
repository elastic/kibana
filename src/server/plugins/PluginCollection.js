
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

  /**
   * Initialize a plugin from a path.
   *
   * @param  {String} path - the location to find the plugin
   * @return {Boolean} - true if the plugin loaded successfully, false if no plugin could be found at the path
   */
  async new(path) {
    try {
      // if this throws then node can't resolve the path to a module
      require.resolve(path);
    } catch (err) {
      return false;
    }

    let api = new PluginApi(this.kbnServer, path);
    let output = [].concat(require(path)(api) || []);
    let config = this.kbnServer.config;

    if (!output.length) return true;

    // clear the byIdCache
    this[byIdCache] = null;
    this[pluginApis].add(api);

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

    return true;
  }

  /**
   * Initialize a plugin from the package.json at a path
   *
   * @param  {String} path - the location of a directory containing a package.json
   * @return {Boolean} - true if the plugin loaded successfully, false if no plugin could be found
   */
  async newFromPackageJson(path) {
    const pkgPath = join(path, 'package.json');

    try {
      require.resolve(pkgPath);
    } catch (err) {
      return false;
    }

    const pkg = require(pkgPath);
    if (!pkg.kibana) return false;

    this.add(new Plugin(this.kbnServer, path, pkg, { uiExports: pkg.kibana }));
    return true;
  }

  get byId() {
    return this[byIdCache] || (this[byIdCache] = indexBy([...this], 'id'));
  }

  getPluginApis() {
    return this[pluginApis];
  }

};
