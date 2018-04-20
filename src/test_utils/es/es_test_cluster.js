import { resolve } from 'path';
import { get } from 'lodash';
import { format } from 'url';
import elasticsearch from 'elasticsearch';
import toPath from 'lodash/internal/toPath';
import { Cluster } from '@kbn/es';
import { esTestConfig } from './es_test_config';
import { rmrfSync } from './rmrf_sync';

export function createTestCluster(options = {}) {
  const {
    port = esTestConfig.getPort(),
    password = 'changeme',
    license = 'oss',
    log,
    basePath = resolve(__dirname, '../../../.es'),
  } = options;

  const randomHash = Math.random().toString(36).substring(2);
  const clusterName = `test-${randomHash}`;
  const config = {
    version: esTestConfig.getVersion(),
    installPath: resolve(basePath, clusterName),
    sourcePath: resolve(__dirname, '../../../../elasticsearch'),
    password,
    license,
    basePath,
  };

  const cluster = new Cluster(log);

  // Use source when running on CI
  const from = options.from || esTestConfig.getBuildFrom();

  return new class EsTestCluster {
    getStartTimeout() {
      const second = 1000;
      const minute = second * 60;

      return from === 'snapshot' ? minute : minute * 6;
    }

    async start(esArgs = []) {
      const { installPath } =
        from === 'source'
          ? await cluster.installSource(config)
          : await cluster.installSnapshot(config);

      await cluster.start(installPath, {
        esArgs: [
          `cluster.name=${clusterName}`,
          `http.port=${port}`,
          `discovery.zen.ping.unicast.hosts=localhost:${port}`,
          ...esArgs
        ],
      });
    }

    async stop() {
      await cluster.stop();
    }

    async cleanup() {
      await this.stop();
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
      parts.port = port;

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
