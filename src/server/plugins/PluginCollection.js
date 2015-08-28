let { get, indexBy } = require('lodash');
let inspect = require('util').inspect;

let PluginApi = require('./PluginApi');
let Collection = require('requirefrom')('src')('utils/Collection');

let byIdCache = Symbol('byIdCache');

module.exports = class Plugins extends Collection {

  constructor(kbnServer) {
    super();
    this.kbnServer = kbnServer;
  }

  async new(path) {
    let api = new PluginApi(this.kbnServer, path);
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

};
