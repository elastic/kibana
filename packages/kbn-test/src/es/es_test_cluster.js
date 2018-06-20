/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { resolve } from 'path';
import { format } from 'url';
import { get } from 'lodash';
import toPath from 'lodash/internal/toPath';
import { Cluster } from '@kbn/es';
import { esTestConfig } from './es_test_config';
import { rmrfSync } from './rmrf_sync';
import { KIBANA_ROOT } from '../';
import elasticsearch from 'elasticsearch';

export function createEsTestCluster(options = {}) {
  const {
    port = esTestConfig.getPort(),
    password = 'changeme',
    license = 'oss',
    log,
    basePath = resolve(KIBANA_ROOT, '.es'),
    // Use source when running on CI
    from = esTestConfig.getBuildFrom(),
  } = options;

  const randomHash = Math.random()
    .toString(36)
    .substring(2);
  const clusterName = `test-${randomHash}`;
  const config = {
    version: esTestConfig.getVersion(),
    installPath: resolve(basePath, clusterName),
    sourcePath: resolve(KIBANA_ROOT, '../elasticsearch'),
    password,
    license,
    basePath,
  };

  const cluster = new Cluster(log);

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
          ...esArgs,
        ],
      });
    }

    async stop() {
      await cluster.stop();
      log.info('[es] stopped');
    }

    async cleanup() {
      await this.stop();
      rmrfSync(config.installPath);
      log.info('[es] cleanup complete');
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
  }();
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
