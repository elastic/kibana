
let { Server } = require('hapi');
let { fromNode } = require('bluebird');
let Boom = require('boom');
let registerHapiPlugins = require('../../server/http/register_hapi_plugins');

module.exports = class LazyServer {
  constructor(host, port, optimizer) {
    this.optimizer = optimizer;
    this.server = new Server();

    registerHapiPlugins(null, this.server);

    this.server.connection({
      host: host,
      port: port
    });
  }

  async init() {
    await this.optimizer.init();
    this.optimizer.bindToServer(this.server);
    await fromNode(cb => this.server.start(cb));
  }
};
