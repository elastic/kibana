/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { defaultsDeep } from 'lodash';
import { Client, HttpConnection } from '@elastic/elasticsearch';
import { Cluster } from '@kbn/es';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';
import { CliArgs } from '@kbn/config';
import { createRoot, type TestElasticsearchUtils, type TestKibanaUtils } from './create_root';

export type TestServerlessESUtils = Pick<TestElasticsearchUtils, 'stop' | 'es'> & {
  getClient: () => Client;
};
export type TestServerlessKibanaUtils = TestKibanaUtils;

export interface TestServerlessUtils {
  startES: () => Promise<TestServerlessESUtils>;
  startKibana: (abortSignal?: AbortSignal) => Promise<TestServerlessKibanaUtils>;
}

/**
 * See docs in {@link TestUtils}. This function provides the same utilities but
 * configured for serverless.
 *
 * @note requires a Docker installation to be running
 */
export function createTestServerlessInstances({
  adjustTimeout,
}: {
  adjustTimeout: (timeout: number) => void;
}): TestServerlessUtils {
  const esUtils = createServerlessES();
  const kbUtils = createServerlessKibana();
  adjustTimeout?.(120_000);
  return {
    startES: async () => {
      const { stop, getClient } = await esUtils.start();
      return {
        es: esUtils.es,
        getClient,
        stop,
      };
    },
    startKibana: async (abortSignal) => {
      abortSignal?.addEventListener('abort', async () => await kbUtils.shutdown());
      await kbUtils.preboot();
      const coreSetup = await kbUtils.setup();
      const coreStart = await kbUtils.start();
      return {
        root: kbUtils,
        coreSetup,
        coreStart,
        stop: kbUtils.shutdown.bind(kbUtils),
      };
    },
  };
}

function createServerlessES() {
  const log = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  });
  const es = new Cluster({ log });
  return {
    es,
    start: async () => {
      await es.runServerless({
        basePath: Path.join(REPO_ROOT, '.es/es_test_serverless'),
      });
      // runServerless doesn't wait until the nodes are up
      await waitUntilClusterReady(getServerlessESClient());
      return {
        getClient: getServerlessESClient,
        stop: async () => {
          // hack to stop the ES cluster
          await execa('docker', ['container', 'stop', 'es01', 'es02', 'es03']);
        },
      };
    },
  };
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitUntilClusterReady = async (client: Client, timeoutMs = 60 * 1000) => {
  const started = Date.now();

  while (started + timeoutMs > Date.now()) {
    try {
      await client.info();
      break;
    } catch (e) {
      await delay(1000);
      /* trap to continue */
    }
  }
};

const getServerlessESClient = () => {
  return new Client({
    // node ports not configurable from
    node: 'http://localhost:9200',
    Connection: HttpConnection,
  });
};

const defaults = {
  server: {
    restrictInternalApis: true,
    versioned: {
      versionResolution: 'newest',
      strictClientVersionCheck: false,
    },
  },
  migrations: {
    algorithm: 'zdt',
  },
  elasticsearch: {
    serviceAccountToken: 'BEEF',
  },
};

function createServerlessKibana(settings = {}, cliArgs: Partial<CliArgs> = {}) {
  return createRoot(defaultsDeep(settings, defaults), { ...cliArgs, serverless: true });
}
