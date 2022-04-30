/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/dev-utils';
import { REPO_ROOT } from '@kbn/utils';
import {
  createTestEsCluster,
  CreateTestEsClusterOptions,
  esTestConfig,
  kibanaServerTestUser,
  systemIndicesSuperuser,
} from '@kbn/test';
import { defaultsDeep } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import supertest from 'supertest';

import { InternalCoreSetup, InternalCoreStart } from '../server/internal_types';
import { CliArgs, Env } from '../server/config';
import { Root } from '../server/root';

export type HttpMethod = 'delete' | 'get' | 'head' | 'post' | 'put';

const DEFAULTS_SETTINGS = {
  server: {
    autoListen: true,
    // Use the ephemeral port to make sure that tests use the first available
    // port and aren't affected by the timing issues in test environment.
    port: 0,
    xsrf: { disableProtection: true },
  },
  logging: {
    root: {
      level: 'off',
    },
  },
  plugins: {},
  migrations: { skip: false },
};

export function createRootWithSettings(
  settings: Record<string, any>,
  cliArgs: Partial<CliArgs> = {}
) {
  const env = Env.createDefault(REPO_ROOT, {
    configs: [],
    cliArgs: {
      dev: false,
      watch: false,
      basePath: false,
      runExamples: false,
      oss: true,
      disableOptimizer: true,
      cache: true,
      dist: false,
      ...cliArgs,
    },
  });

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
export function createRootWithCorePlugins(settings = {}, cliArgs: Partial<CliArgs> = {}) {
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
    cliArgs
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
  startKibana: () => Promise<TestKibanaUtils>;
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
  const license = settings.es?.license ?? 'basic';
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

  const kbnSettings = settings.kbn ?? {};

  return {
    startES: async () => {
      await es.start();

      if (['gold', 'trial'].includes(license)) {
        // Override provided configs
        kbnSettings.elasticsearch = {
          hosts: es.getHostUrls(),
          username: kibanaServerTestUser.username,
          password: kibanaServerTestUser.password,
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
    startKibana: async () => {
      const root = createRootWithCorePlugins(kbnSettings);

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
