import { resolve } from 'path';

import libesvm from 'libesvm';

const ESVM_DIR = resolve(__dirname, '../../../esvm/test_utils/es_test_cluster');

export class EsTestCluster {
  _freshBranches = [];
  _directory = resolve(ESVM_DIR);

  use(options = {}) {
    const {
      name,
      port,
      log = console.log,
      branch = 'master',
    } = options;

    if (!name || !port) {
      throw new Error('esTestCluster.use() requires { name, port }');
    }

    // assigned in use.start(), reassigned in use.stop()
    let cluster;

    return {
      start: async () => {
        const download = this._isDownloadNeeded(branch);

        cluster = libesvm.createCluster({
          fresh: download,
          purge: !download,
          directory: this._directory,
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

    if (this._freshBranches.includes(branch)) {
      return false;
    }

    this._freshBranches.push(branch);
    return true;
  }
}

export const esTestCluster = new EsTestCluster();
