/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { defaultsDeep } from 'lodash';
import { Client, HttpConnection } from '@elastic/elasticsearch';
import { Cluster } from '@kbn/es';
import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';
import { esTestConfig } from '@kbn/test';
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

const ES_BASE_PATH_DIR = Path.join(REPO_ROOT, '.es/es_test_serverless');

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
  adjustTimeout?.(150_000);

  const esUtils = createServerlessES();
  const kbUtils = createServerlessKibana();

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
  const esPort = esTestConfig.getPort();
  return {
    es,
    start: async () => {
      await es.runServerless({
        basePath: ES_BASE_PATH_DIR,
        port: esPort,
        teardown: true,
        background: true,
        clean: true,
      });
      const client = getServerlessESClient({ port: esPort });

      // runServerless doesn't wait until the nodes are up
      await waitUntilClusterReady(client);

      return {
        getClient: () => client,
        stop: async () => {
          await es.stop();
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

const getServerlessESClient = ({ port }: { port: number }) => {
  return new Client({
    node: `http://localhost:${port}`,
    Connection: HttpConnection,
  });
};

const getServerlessDefault = () => {
  return {
    server: {
      restrictInternalApis: true,
      versioned: {
        versionResolution: 'newest',
        strictClientVersionCheck: false,
      },
    },
    elasticsearch: {
      hosts: [`http://localhost:${esTestConfig.getPort()}`],
    },
    migrations: {
      algorithm: 'zdt',
      zdt: {
        runOnRoles: ['ui'],
      },
    },
    logging: {
      loggers: [
        {
          name: 'root',
          level: 'error',
          appenders: ['console'],
        },
        {
          name: 'elasticsearch.deprecation',
          level: 'all',
          appenders: ['deprecation'],
        },
      ],
      appenders: {
        deprecation: { type: 'console', layout: { type: 'json' } },
        console: { type: 'console', layout: { type: 'pattern' } },
      },
    },
  };
};

function createServerlessKibana(settings = {}, cliArgs: Partial<CliArgs> = {}) {
  return createRoot(defaultsDeep(settings, getServerlessDefault()), {
    ...cliArgs,
    serverless: true,
  });
}
