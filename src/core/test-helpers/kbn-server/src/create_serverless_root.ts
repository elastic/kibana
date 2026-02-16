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
import type { ServerlessProjectType } from '@kbn/es';
import { Cluster } from '@kbn/es';
import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';
import { esTestConfig } from '@kbn/test';
import type { CliArgs } from '@kbn/config';
import { kibanaDevServiceAccount, CA_CERT_PATH } from '@kbn/dev-utils';
import { systemIndicesSuperuser } from '@kbn/test';
import { set } from '@kbn/safer-lodash-set';
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
const DEFAULT_PROJECT_TYPE: ServerlessProjectType = 'es';
const DEFAULT_KIBANA_URL = 'http://localhost:5601/';

/**
 * See docs in {@link TestUtils}. This function provides the same utilities but
 * configured for serverless.
 *
 * @note requires a Docker installation to be running
 */
export function createTestServerlessInstances({
  adjustTimeout,
  kibana = {},
  enableCPS = false,
  esArgs = [],
  projectType = DEFAULT_PROJECT_TYPE,
  kibanaUrl = DEFAULT_KIBANA_URL,
}: {
  kibana?: {
    settings?: {};
    cliArgs?: Partial<CliArgs>;
  };
  adjustTimeout?: (timeout: number) => void;
  /**
   * Enable Cross-Project Search (CPS) mode on the serverless ES instance.
   * When true, starts ES with UIAM support and the required CPS settings:
   *  - `serverless.cross_project.enabled=true`
   *  - `remote_cluster_server.enabled=true`
   *
   * Equivalent to running:
   *  `yarn es serverless --projectType observability --uiam --kill --clean \
   *    --kibanaUrl http://localhost:5601/ \
   *    -E serverless.cross_project.enabled=true -E remote_cluster_server.enabled=true`
   *
   * @default false
   */
  enableCPS?: boolean;
  /**
   * Additional Elasticsearch arguments to pass when starting the cluster.
   * These are general-purpose ES configuration arguments that will be appended
   * to any default arguments (including CPS args when enableCPS is true).
   *
   * Example: `['script.allowed_types=inline']`
   *
   * @default []
   */
  esArgs?: string[];
  /**
   * The serverless project type to run (`yarn es serverless --projectType`).
   *
   * Defaults to `es` for existing tests.
   */
  projectType?: ServerlessProjectType;
  /**
   * Passed through to the `@kbn/es` serverless docker runner as `--kibanaUrl`.
   *
   * This is important for UIAM mode: the serverless runner only applies the
   * UIAM-related ES args (including project metadata) when `kibanaUrl` is set.
   *
   * See `resolveEsArgs()` in `src/platform/packages/shared/kbn-es/src/utils/docker.ts`.
   */
  kibanaUrl?: string;
} = {}): TestServerlessUtils {
  adjustTimeout?.(150_000);

  const esUtils = createServerlessES({
    enableCPS,
    esArgs,
    projectType,
    // Ensure the serverless runner configures mock IDP/UIAM settings when CPS is enabled.
    kibanaUrl: enableCPS ? kibanaUrl : undefined,
  });

  if (enableCPS) {
    if (!kibana.settings) kibana.settings = {};
    set(kibana.settings, 'cps.cpsEnabled', true);
    // Match the default `yarn es serverless --uiam` setup, but allow tests to override
    // auth by pre-setting `elasticsearch.username/password` (e.g. use `system_indices_superuser`).
    const existingEsSettings = (kibana.settings as any).elasticsearch ?? {};
    set(kibana.settings, 'elasticsearch.hosts', [`https://localhost:${esTestConfig.getPort()}`]);
    set(kibana.settings, 'elasticsearch.ssl.certificateAuthorities', CA_CERT_PATH);
    if (
      (existingEsSettings.username || existingEsSettings.password) &&
      existingEsSettings.serviceAccountToken
    ) {
      // Config schema forbids specifying both serviceAccountToken and username/password.
      delete (kibana.settings as any).elasticsearch.serviceAccountToken;
    }
    if (
      !existingEsSettings.serviceAccountToken &&
      !existingEsSettings.username &&
      !existingEsSettings.password
    ) {
      set(kibana.settings, 'elasticsearch.serviceAccountToken', kibanaDevServiceAccount.token);
    }
    kibana.cliArgs = { ...kibana.cliArgs, uiam: true, serverless: true };
  }
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

function createServerlessES({
  enableCPS = false,
  esArgs = [],
  projectType = DEFAULT_PROJECT_TYPE,
  kibanaUrl,
}: {
  enableCPS?: boolean;
  esArgs?: string[];
  projectType?: ServerlessProjectType;
  kibanaUrl?: string;
} = {}) {
  const log = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  });
  const es = new Cluster({ log });
  const esPort = esTestConfig.getPort();
  const esServerlessImageParams = parseEsServerlessImageOverride(
    esTestConfig.getESServerlessImage()
  );
  const baseArgs = enableCPS
    ? ['serverless.cross_project.enabled=true', 'remote_cluster_server.enabled=true']
    : [];

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
        ...(kibanaUrl ? { kibanaUrl } : {}),
        ...esServerlessImageParams,
        ...(enableCPS
          ? {
              ssl: true,
              uiam: true,
              esArgs: [...baseArgs, ...esArgs],
            }
          : {}),
      });
      const client = getServerlessESClient({ port: esPort, ssl: enableCPS });

      return {
        getClient: () => client,
        stop: async () => {
          await es.stop();
        },
      };
    },
  };
}

const getServerlessESClient = ({ port, ssl = false }: { port: number; ssl?: boolean }) => {
  return new Client({
    node: `${ssl ? 'https' : 'http'}://localhost:${port}`,
    Connection: HttpConnection,
    requestTimeout: 30_000,
    auth: { ...systemIndicesSuperuser },
    ...(ssl ? { tls: { rejectUnauthorized: false } } : {}),
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

export function createServerlessKibana(settings = {}, cliArgs: Partial<CliArgs> = {}) {
  // Serverless defaults include `elasticsearch.serviceAccountToken`, but some tests may want
  // to run with basic auth (`elasticsearch.username/password`). Kibana config schema forbids
  // specifying both, so if username/password are provided, drop the token from defaults.
  const defaults = getServerlessDefault();
  const esOverrides = (settings as any)?.elasticsearch;
  if (esOverrides?.username || esOverrides?.password) {
    delete (defaults as any).elasticsearch.serviceAccountToken;
  }

  return createRoot(defaultsDeep(settings, defaults), {
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
