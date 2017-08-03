import { resolve } from 'path';

import libesvm from 'libesvm';

import { esTestConfig } from './es_test_config';

const ESVM_DIR = resolve(__dirname, '../../../esvm/test_utils/es_test_cluster');
const BRANCHES_DOWNLOADED = [];

function isDownloadNeeded(branch) {
  if (process.env.ESVM_NO_FRESH || process.argv.includes('--esvm-no-fresh')) {
    return false;
  }

  if (BRANCHES_DOWNLOADED.includes(branch)) {
    return false;
  }

  return true;
}

export function createEsTestCluster(options = {}) {
  const {
    name,
    log = console.log,
    port = esTestConfig.getPort(),
    branch = esTestConfig.getBranch(),
  } = options;

  if (!name) {
    throw new Error('createEsTestCluster() requires { name }');
  }

  // assigned in use.start(), reassigned in use.stop()
  let cluster;

  return new class EsTestCluster {
    getStartTimeout() {
      return esTestConfig.getLibesvmStartTimeout();
    }

    async start() {
      const download = isDownloadNeeded(branch);

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
        BRANCHES_DOWNLOADED.push(branch);
      }

      await cluster.start();
    }

    async stop() {
      if (cluster) {
        const c = cluster;
        cluster = null;
        await c.shutdown();
      }
    }
  };
}
