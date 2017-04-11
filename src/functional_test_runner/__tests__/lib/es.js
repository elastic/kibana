import { resolve } from 'path';

import { once, merge } from 'lodash';
import libesvm from 'libesvm';

const VERSION = 'master';
const DIRECTORY = resolve(__dirname, '../../../../esvm/functional_test_runner_tests');

const createCluster = (options = {}) => {
  return libesvm.createCluster(merge({
    directory: DIRECTORY,
    branch: VERSION,
  }, options));
};

const install = once(async (fresh) => {
  await createCluster({ fresh }).install();
});

export async function startupEs(opts) {
  const {
    port,
    log,
    fresh = true
  } = opts;

  await install({ fresh });
  const cluster = createCluster({
    config: {
      http: {
        port
      }
    }
  });

  cluster.on('log', (event) => {
    const method = event.level.toLowerCase() === 'info' ? 'verbose' : 'debug';
    log[method](`${event.level}: ${event.type} - ${event.message}`);
  });

  await cluster.start();
  return cluster;
}
