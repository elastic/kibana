let _ = require('lodash');
let inspect = require('util').inspect;
let PluginApi = require('./PluginApi');

module.exports = class Plugins extends Array {

  constructor(kbnServer) {
    super();
    this.kbnServer = kbnServer;
  }

  new(path) {
    var api = new PluginApi(this.kbnServer, path);
    let output = [].concat(require(path)(api) || []);

    for (let product of output) {
      if (product instanceof api.Plugin) {
        this._byId = null;
        this.push(product);
      } else {
        throw new TypeError('unexpected plugin export ' + inspect(product));
      }
    }
  }

  get byId() {
    return this._byId || (this._byId = _.indexBy(this, 'id'));
  }

};
