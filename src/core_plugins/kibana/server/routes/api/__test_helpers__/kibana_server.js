import * as kbnTestServer from '../../../../../../../test/utils/kbn_server';
import serverConfig from '../../../../../../../test/server_config';
import { fromRoot } from '../../../../../../utils';

export function setupKibanaServer() {
  let kbnServer;

  async function startServer() {
    if (!this || typeof this.timeout !== 'function') {
      throw new Error(`
        setupKibanaServer() must be passed directly to mocha's before()
        function, ie: before(setupKibanaServer)
      `);
    }

    this.timeout(60000); // sometimes waiting for server takes longer than 10
    kbnServer = kbnTestServer.createServer({
      server: {
        port: serverConfig.servers.kibana.port,
        autoListen: true
      },
      plugins: {
        scanDirs: [
          fromRoot('src/core_plugins')
        ]
      }
    });
    await kbnServer.ready();
    await kbnServer.server.plugins.elasticsearch.waitUntilReady();
  }

  async function stopServer() {
    await kbnServer.close();
  }

  return {
    kbnServer,
    startServer,
    stopServer
  };
}
