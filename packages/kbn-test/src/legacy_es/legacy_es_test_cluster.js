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
import { get, toPath } from 'lodash';
import { Cluster } from '@kbn/es';
import { CI_PARALLEL_PROCESS_PREFIX } from '../ci_parallel_process_prefix';
import { esTestConfig } from './es_test_config';

import { KIBANA_ROOT } from '../';
import * as legacyElasticsearch from 'elasticsearch';
const path = require('path');
const del = require('del');

export function createLegacyEsTestCluster(options = {}) {
  const {
    port = esTestConfig.getPort(),
    password = 'changeme',
    license = 'oss',
    log,
    basePath = resolve(KIBANA_ROOT, '.es'),
    esFrom = esTestConfig.getBuildFrom(),
    dataArchive,
    esArgs: customEsArgs = [],
    esEnvVars,
    clusterName: customClusterName = 'es-test-cluster',
    ssl,
  } = options;

  const clusterName = `${CI_PARALLEL_PROCESS_PREFIX}${customClusterName}`;

  const esArgs = [
    `cluster.name=${clusterName}`,
    `http.port=${port}`,
    'discovery.type=single-node',
    `transport.port=${esTestConfig.getTransportPort()}`,
    ...customEsArgs,
  ];

  const config = {
    version: esTestConfig.getVersion(),
    installPath: resolve(basePath, clusterName),
    sourcePath: resolve(KIBANA_ROOT, '../elasticsearch'),
    password,
    license,
    basePath,
    esArgs,
  };

  const cluster = new Cluster({ log, ssl });

  return new (class EsTestCluster {
    getStartTimeout() {
      const second = 1000;
      const minute = second * 60;

      return esFrom === 'snapshot' ? 3 * minute : 6 * minute;
    }

    async start() {
      let installPath;

      if (esFrom === 'source') {
        installPath = (await cluster.installSource(config)).installPath;
      } else if (esFrom === 'snapshot') {
        installPath = (await cluster.installSnapshot(config)).installPath;
      } else if (path.isAbsolute(esFrom)) {
        installPath = esFrom;
      } else {
        throw new Error(`unknown option esFrom "${esFrom}"`);
      }

      if (dataArchive) {
        await cluster.extractDataDirectory(installPath, dataArchive);
      }

      await cluster.start(installPath, {
        password: config.password,
        esArgs,
        esEnvVars,
      });
    }

    async stop() {
      await cluster.stop();
      log.info('[es] stopped');
    }

    async cleanup() {
      await this.stop();
      await del(config.installPath, { force: true });
      log.info('[es] cleanup complete');
    }

    /**
     * Returns an ES Client to the configured cluster
     */
    getClient() {
      return new legacyElasticsearch.Client({
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
  })();
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
