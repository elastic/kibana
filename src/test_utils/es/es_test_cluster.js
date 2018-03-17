import { resolve } from 'path';
import { get } from 'lodash';
import { format } from 'url';
import elasticsearch from 'elasticsearch';
import toPath from 'lodash/internal/toPath';
import { Cluster } from '@kbn/es';
import { esTestConfig } from './es_test_config';
import { rmrfSync } from './rmrf_sync';

export function createTestCluster(options = {}) {
  const config = {
    version: esTestConfig.getVersion(),
    sourcePath: resolve(__dirname, '../../../../elasticsearch'),
    port: esTestConfig.getPort(),
    basePath: resolve(__dirname, '../../../.es'),
    ...options,
  };

  const hash = Math.random()
    .toString(36)
    .substring(2);
  config.installPath = resolve(config.basePath, hash);

  const cluster = new Cluster(options.log);
  const from = esTestConfig.getBuildFrom();

  return new class EsTestCluster {
    getStartTimeout() {
      const second = 1000;
      const minute = second * 60;

      return from === 'snapshot' ? minute : minute * 3;
    }

    async start() {
      const { installPath } =
        from === 'source'
          ? await cluster.installSource(config)
          : await cluster.installSnapshot(config);

      await cluster.start(installPath, {
        esArgs: [
          'cluster.name=kbn-test',
          `http.port=${config.port}`,
          `discovery.zen.ping.unicast.hosts=localhost:${config.port}`,
        ],
      });
    }

    stop() {
      cluster.stop();
      rmrfSync(config.installPath);
    }

    /**
     * Returns an ES Client to the configured cluster
     */
    getClient() {
      return new elasticsearch.Client({
        host: this.getUrl(),
      });
    }

    getCallCluster() {
      return createCallCluster(this.getClient());
    }

    getUrl() {
      const parts = esTestConfig.getUrlParts();
      parts.port = config.port;

      return format(parts);
    }
  };
}

/**
 *  Create a callCluster function that properly executes methods on an
 *  elasticsearch-js client
 *
 *  @param  {elasticsearch.Client} esClient
 *  @return {Function}
 */
function createCallCluster(esClient) {
  return function callCluster(method, params) {
    const path = toPath(method);
    const contextPath = path.slice(0, -1);

    const action = get(esClient, path);
    const context = contextPath.length ? get(esClient, contextPath) : esClient;

    return action.call(context, params);
  };
}
