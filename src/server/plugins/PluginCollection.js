let _ = require('lodash');
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
    var api = new PluginApi(this.kbnServer, path);
    let output = [].concat(require(path)(api) || []);

    for (let product of output) {
      if (product instanceof api.Plugin) {
        this[byIdCache] = null;
        this.add(product);
        await product.setupConfig();
      } else {
        throw new TypeError('unexpected plugin export ' + inspect(product));
      }
    }
  }

  get byId() {
    return this[byIdCache] || (this[byIdCache] = _.indexBy([...this], 'id'));
  }

};
