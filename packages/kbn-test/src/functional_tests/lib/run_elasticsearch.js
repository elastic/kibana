import { resolve } from 'path';
import { KIBANA_ROOT } from './paths';
import { createEsTestCluster } from '../../es';

import { setupUsers, DEFAULT_SUPERUSER_PASS } from './auth';

export async function runElasticsearch({ config, options }) {
  const { log, esFrom } = options;
  const isOss = config.get('esTestCluster.license') === 'oss';

  const cluster = createEsTestCluster({
    port: config.get('servers.elasticsearch.port'),
    password: !isOss
      ? DEFAULT_SUPERUSER_PASS
      : config.get('servers.elasticsearch.password'),
    license: config.get('esTestCluster.license'),
    log,
    basePath: resolve(KIBANA_ROOT, '.es'),
    esFrom: esFrom || config.get('esTestCluster.from'),
  });

  const esArgs = config.get('esTestCluster.serverArgs');

  await cluster.start(esArgs);

  if (!isOss) {
    await setupUsers(log, config);
  }

  return cluster;
}
