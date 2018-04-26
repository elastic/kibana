
import { Server } from 'hapi';
import { fromNode } from 'bluebird';
import { registerHapiPlugins } from '../../server/http/register_hapi_plugins';

export default class WatchServer {
  constructor(host, port, basePath, optimizer) {
    this.basePath = basePath;
    this.optimizer = optimizer;
    this.server = new Server();

    registerHapiPlugins(this.server);

    this.server.connection({
      host: host,
      port: port
    });
  }

  async init() {
    await this.optimizer.init();
    this.optimizer.bindToServer(this.server, this.basePath);
    await fromNode(cb => this.server.start(cb));
  }
}
