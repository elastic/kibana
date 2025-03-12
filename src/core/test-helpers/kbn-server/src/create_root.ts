/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import loadJsonFile from 'load-json-file';
import { defaultsDeep } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import supertest from 'supertest';
import { set } from '@kbn/safer-lodash-set';

import { getPackages } from '@kbn/repo-packages';
import { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';
import { getFips } from 'crypto';
import {
  createTestEsCluster,
  CreateTestEsClusterOptions,
  esTestConfig,
  kibanaServerTestUser,
  systemIndicesSuperuser,
} from '@kbn/test';
import { CliArgs, Env, RawPackageInfo } from '@kbn/config';

import type { InternalCoreSetup, InternalCoreStart } from '@kbn/core-lifecycle-server-internal';
import { Root } from '@kbn/core-root-server-internal';

export type HttpMethod = 'delete' | 'get' | 'head' | 'post' | 'put' | 'patch';

const DEFAULTS_SETTINGS = {
  server: {
    autoListen: true,
    // Use the ephemeral port to make sure that tests use the first available
    // port and aren't affected by the timing issues in test environment.
    port: 0,
    xsrf: { disableProtection: true },
    restrictInternalApis: true,
  },
  logging: {
    root: {
      level: 'off',
    },
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
  plugins: {},
  migrations: { skip: false },
};

export function createRootWithSettings(
  settings: Record<string, any>,
  cliArgs: Partial<CliArgs> = {},
  customKibanaVersion?: string
) {
  let pkg: RawPackageInfo | undefined;
  if (customKibanaVersion) {
    pkg = loadJsonFile.sync(join(REPO_ROOT, 'package.json')) as RawPackageInfo;
    pkg.version = customKibanaVersion;
  }

  /*
   * Most of these integration tests expect OSS to default to true, but FIPS
   * requires the security plugin to be enabled
   */
  let oss = true;
  if (getFips() === 1) {
    set(settings, 'xpack.security.fipsMode.enabled', true);
    oss = false;
    delete cliArgs.oss;
  }

  const env = Env.createDefault(
    REPO_ROOT,
    {
      configs: [],
      cliArgs: {
        dev: false,
        watch: false,
        basePath: false,
        runExamples: false,
        disableOptimizer: true,
        cache: true,
        dist: false,
        oss,
        ...cliArgs,
      },
      repoPackages: getPackages(REPO_ROOT),
    },
    pkg
  );

  return new Root(
    {
      getConfig$: () => new BehaviorSubject(defaultsDeep({}, settings, DEFAULTS_SETTINGS)),
    },
    env
  );
}

/**
 * Returns supertest request attached to the core's internal native Node server.
 * @param root
 * @param method
 * @param path
 */
export function getSupertest(root: Root, method: HttpMethod, path: string) {
  const testUserCredentials = Buffer.from(
    `${systemIndicesSuperuser.username}:${systemIndicesSuperuser.password}`
  );
  return supertest((root as any).server.http.httpServer.server.listener)
    [method](path)
    .set('Authorization', `Basic ${testUserCredentials.toString('base64')}`);
}

/**
 * Creates an instance of Root with default configuration
 * tailored for unit tests.
 *
 * @param {Object} [settings={}] Any config overrides for this instance.
 * @returns {Root}
 */
export function createRoot(settings = {}, cliArgs: Partial<CliArgs> = {}) {
  return createRootWithSettings(settings, cliArgs);
}

/**
 *  Creates an instance of Root, including all of the core plugins,
 *  with default configuration tailored for unit tests.
 *
 *  @param {Object} [settings={}] Any config overrides for this instance.
 *  @returns {Root}
 */
export function createRootWithCorePlugins(
  settings = {},
  cliArgs: Partial<CliArgs> = {},
  customKibanaVersion?: string
) {
  const DEFAULT_SETTINGS_WITH_CORE_PLUGINS = {
    elasticsearch: {
      hosts: [esTestConfig.getUrl()],
      username: kibanaServerTestUser.username,
      password: kibanaServerTestUser.password,
    },
    // Log ES deprecations to surface these in CI
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
    server: { restrictInternalApis: true },
    // createRootWithSettings sets default value to "true", so undefined should be threatened as "true".
    ...(cliArgs.oss === false
      ? {
          // reporting loads headless browser, that prevents nodejs process from exiting and causes test flakiness
          xpack: {
            reporting: {
              enabled: false,
            },
          },
        }
      : {}),
  };

  return createRootWithSettings(
    defaultsDeep({}, settings, DEFAULT_SETTINGS_WITH_CORE_PLUGINS),
    cliArgs,
    customKibanaVersion
  );
}

export const request: Record<
  HttpMethod,
  (root: Root, path: string) => ReturnType<typeof getSupertest>
> = {
  delete: (root, path) => getSupertest(root, 'delete', path),
  get: (root, path) => getSupertest(root, 'get', path),
  head: (root, path) => getSupertest(root, 'head', path),
  post: (root, path) => getSupertest(root, 'post', path),
  put: (root, path) => getSupertest(root, 'put', path),
  patch: (root, path) => getSupertest(root, 'patch', path),
};

export interface TestElasticsearchUtils {
  stop: () => Promise<void>;
  es: ReturnType<typeof createTestEsCluster>;
  hosts: string[];
  username: string;
  password: string;
}

export interface TestKibanaUtils {
  root: Root;
  coreSetup: InternalCoreSetup;
  coreStart: InternalCoreStart;
  stop: () => Promise<void>;
}

export interface TestUtils {
  startES: () => Promise<TestElasticsearchUtils>;
  startKibana: (abortSignal?: AbortSignal) => Promise<TestKibanaUtils>;
}

/**
 * Creates an instance of the Root, including all of the core "legacy" plugins,
 * with default configuration tailored for unit tests, and starts es.
 *
 * @param options
 * @prop settings Any config overrides for this instance.
 * @prop adjustTimeout A function(t) => this.timeout(t) that adjust the timeout of a
 * test, ensuring the test properly waits for the server to boot without timing out.
 */
export function createTestServers({
  adjustTimeout,
  settings = {},
}: {
  adjustTimeout: (timeout: number) => void;
  settings?: {
    es?: Partial<CreateTestEsClusterOptions>;
    kbn?: {
      /**
       * An array of directories paths, passed in via absolute path strings
       */
      plugins?: {
        paths: string[];
        [key: string]: any;
      };
      [key: string]: any;
    };
    /**
     * Users passed in via this prop are created in ES in adition to the standard elastic and kibana users.
     * Note, this prop is ignored when using an oss, or basic license
     */
    users?: Array<{ username: string; password: string; roles: string[] }>;
  };
}): TestUtils {
  if (!adjustTimeout) {
    throw new Error('adjustTimeout is required in order to avoid flaky tests');
  }
  let license = settings.es?.license ?? 'basic';

  if (getFips() === 1) {
    // Set license to 'trial' if Node is running in FIPS mode
    license = 'trial';
  }

  const usersToBeAdded = settings.users ?? [];
  if (usersToBeAdded.length > 0) {
    if (license !== 'trial') {
      throw new Error(
        'Adding users is only supported by createTestServers when using a trial license'
      );
    }
  }

  const log = new ToolingLog({
    level: 'debug',
    writeTo: process.stdout,
  });

  const es = createTestEsCluster(
    defaultsDeep({}, settings.es ?? {}, {
      log,
      license,
    })
  );

  // Add time for KBN and adding users
  adjustTimeout(es.getStartTimeout() + 100000);

  const { cliArgs = {}, customKibanaVersion, ...kbnSettings } = settings.kbn ?? {};

  return {
    startES: async () => {
      await es.start();

      if (['gold', 'trial'].includes(license)) {
        // Override provided configs
        kbnSettings.elasticsearch = {
          hosts: es.getHostUrls(),
          username: kibanaServerTestUser.username,
          password: kibanaServerTestUser.password,
          ...(getFips() ? kbnSettings.elasticsearch : {}),
        };
      }

      return {
        stop: async () => await es.cleanup(),
        es,
        hosts: es.getHostUrls(),
        username: kibanaServerTestUser.username,
        password: kibanaServerTestUser.password,
      };
    },
    startKibana: async (abortSignal?: AbortSignal) => {
      const root = createRootWithCorePlugins(kbnSettings, cliArgs, customKibanaVersion);

      abortSignal?.addEventListener('abort', async () => await root.shutdown());

      await root.preboot();
      const coreSetup = await root.setup();
      const coreStart = await root.start();

      return {
        root,
        coreSetup,
        coreStart,
        stop: async () => await root.shutdown(),
      };
    },
  };
}
