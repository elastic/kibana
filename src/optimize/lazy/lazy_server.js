
import { Server } from 'hapi';
import { fromNode } from 'bluebird';
import registerHapiPlugins from '../../server/http/register_hapi_plugins';

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
