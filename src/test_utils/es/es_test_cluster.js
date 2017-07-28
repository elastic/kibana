import { resolve } from 'path';
import { esTestConfig } from './es_test_config';

import libesvm from 'libesvm';

const ESVM_DIR = resolve(__dirname, '../../../esvm/test_utils/es_test_cluster');

export class EsTestCluster {
  _branchesDownloaded = [];

  use(options = {}) {
    const {
      name,
      log = console.log,
      port = esTestConfig.getPort(),
      branch = esTestConfig.getBranch(),
    } = options;

    if (!name) {
      throw new Error('esTestCluster.use() requires { name }');
    }

    // assigned in use.start(), reassigned in use.stop()
    let cluster;

    return {
      getStartTimeout: () => {
        return esTestConfig.getLibesvmStartTimeout();
      },

      start: async () => {
        const download = this._isDownloadNeeded(branch);

        if (cluster) {
          throw new Error(`
            EsTestCluster[${name}] is already started, call and await es.stop()
            before calling es.start() again.
          `);
        }

        cluster = libesvm.createCluster({
          fresh: download,
          purge: !download,
          directory: ESVM_DIR,
          branch,
          config: {
            http: {
              port,
            },
            cluster: {
              name,
            },
            discovery: {
              zen: {
                ping: {
                  unicast: {
                    hosts: [ `localhost:${port}` ]
                  }
                }
              }
            }
          }
        });

        cluster.on('log', (event) => {
          log(`EsTestCluster[${name}]: ${event.type} - ${event.message}`);
        });

        await cluster.install();

        if (download) {
          // track the branches that have successfully downloaded
          // after cluster.install() resolves
          this._branchesDownloaded.push(branch);
        }

        await cluster.start();
      },

      stop: async () => {
        if (cluster) {
          const c = cluster;
          cluster = null;
          await c.shutdown();
        }
      }
    };
  }

  _isDownloadNeeded(branch) {
    if (process.env.ESVM_NO_FRESH || process.argv.includes('--esvm-no-fresh')) {
      return false;
    }

    if (this._branchesDownloaded.includes(branch)) {
      return false;
    }

    return true;
  }
}

export const esTestCluster = new EsTestCluster();
