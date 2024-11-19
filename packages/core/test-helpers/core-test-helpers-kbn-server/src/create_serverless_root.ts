/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { defaultsDeep } from 'lodash';
import { Client, HttpConnection } from '@elastic/elasticsearch';
import { Cluster, ServerlessProjectType } from '@kbn/es';
import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';
import { esTestConfig } from '@kbn/test';
import { CliArgs } from '@kbn/config';
import { kibanaDevServiceAccount } from '@kbn/dev-utils';
import { systemIndicesSuperuser } from '@kbn/test';
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
const projectType: ServerlessProjectType = 'es';

/**
 * See docs in {@link TestUtils}. This function provides the same utilities but
 * configured for serverless.
 *
 * @note requires a Docker installation to be running
 */
export function createTestServerlessInstances({
  adjustTimeout,
  kibana = {},
}: {
  kibana?: {
    settings?: {};
    cliArgs?: Partial<CliArgs>;
  };
  adjustTimeout?: (timeout: number) => void;
} = {}): TestServerlessUtils {
  adjustTimeout?.(150_000);

  const esUtils = createServerlessES();
  const kbUtils = createServerlessKibana(kibana.settings, kibana.cliArgs);

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
  const esServerlessImageParams = parseEsServerlessImageOverride(
    esTestConfig.getESServerlessImage()
  );
  return {
    es,
    start: async () => {
      await es.runServerless({
        projectType,
        basePath: ES_BASE_PATH_DIR,
        port: esPort,
        background: true,
        clean: true,
        kill: true,
        waitForReady: true,
        ...esServerlessImageParams,
      });
      const client = getServerlessESClient({ port: esPort });

      return {
        getClient: () => client,
        stop: async () => {
          await es.stop();
        },
      };
    },
  };
}

const getServerlessESClient = ({ port }: { port: number }) => {
  return new Client({
    node: `http://localhost:${port}`,
    Connection: HttpConnection,
    auth: { ...systemIndicesSuperuser },
  });
};

const getServerlessDefault = () => {
  return {
    server: {
      restrictInternalApis: true, // has no effect, defaults to true
      versioned: {
        versionResolution: 'newest',
        strictClientVersionCheck: false,
      },
    },
    elasticsearch: {
      hosts: [`http://localhost:${esTestConfig.getPort()}`],
      serviceAccountToken: kibanaDevServiceAccount.token,
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

function parseEsServerlessImageOverride(dockerImageOrTag: string | undefined): {
  image?: string;
  tag?: string;
} {
  if (!dockerImageOrTag) {
    return {};
  } else if (dockerImageOrTag.includes(':')) {
    return {
      image: dockerImageOrTag,
    };
  } else {
    return {
      tag: dockerImageOrTag,
    };
  }
}
