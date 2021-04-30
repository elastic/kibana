/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { format } from 'url';
import del from 'del';
// @ts-expect-error in js
import { Cluster } from '@kbn/es';
import { Client } from '@elastic/elasticsearch';
import type { KibanaClient } from '@elastic/elasticsearch/api/kibana';
import type { ToolingLog } from '@kbn/dev-utils';
import { CI_PARALLEL_PROCESS_PREFIX } from '../ci_parallel_process_prefix';
import { esTestConfig } from './es_test_config';

import { KIBANA_ROOT } from '../';

interface TestClusterFactoryOptions {
  port?: number;
  password?: string;
  license?: 'basic' | 'trial'; // | 'oss'
  basePath?: string;
  esFrom?: string;
  /**
   * Path to data archive snapshot to run Elasticsearch with.
   * To prepare the the snapshot:
   * - run Elasticsearch server
   * - index necessary data
   * - stop Elasticsearch server
   * - go to Elasticsearch folder: cd .es/${ELASTICSEARCH_VERSION}
   * - archive data folder: zip -r my_archive.zip data
   * */
  dataArchive?: string;
  esArgs?: string[];
  esEnvVars?: Record<string, any>;
  clusterName?: string;
  log: ToolingLog;
  ssl?: boolean;
}

export function createTestEsCluster(options: TestClusterFactoryOptions) {
  const {
    port = esTestConfig.getPort(),
    password = 'changeme',
    license = 'basic',
    log,
    basePath = Path.resolve(KIBANA_ROOT, '.es'),
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
    installPath: Path.resolve(basePath, clusterName),
    sourcePath: Path.resolve(KIBANA_ROOT, '../elasticsearch'),
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
      } else if (Path.isAbsolute(esFrom)) {
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
    getClient(): KibanaClient {
      return new Client({
        node: this.getUrl(),
      });
    }

    getUrl() {
      const parts = esTestConfig.getUrlParts();
      parts.port = port;

      return format(parts);
    }
  })();
}
