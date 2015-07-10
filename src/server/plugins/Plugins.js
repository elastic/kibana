'use strict';

let _ = require('lodash');
let inspect = require('util').inspect;
let PluginApi = require('./PluginApi');

module.exports = class Plugins extends Array {

  constructor(kbnServer) {
    super();
    this.kbnServer = kbnServer;
  }

  new(path) {
    var self = this;
    var api = new PluginApi(this.kbnServer, path);

    [].concat(require(path)(api) || [])
    .forEach(function (out) {
      if (out instanceof api.Plugin) {
        self._byId = null;
        self.push(out);
      } else {
        throw new TypeError('unexpected plugin export ' + inspect(out));
      }
    });
  }

  get byId() {
    return this._byId || (this._byId = _.indexBy(this, 'id'));
  }

};
