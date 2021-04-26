/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaClient } from '@elastic/elasticsearch/api/kibana';
import { ToolingLog, REPO_ROOT } from '@kbn/dev-utils';
import {
  // @ts-expect-error https://github.com/elastic/kibana/issues/95679
  createLegacyEsTestCluster,
  // @ts-expect-error https://github.com/elastic/kibana/issues/95679
  DEFAULT_SUPERUSER_PASS,
  // @ts-expect-error https://github.com/elastic/kibana/issues/95679
  esTestConfig,
  // @ts-expect-error https://github.com/elastic/kibana/issues/95679
  kbnTestConfig,
  // @ts-expect-error https://github.com/elastic/kibana/issues/95679
  kibanaServerTestUser,
  // @ts-expect-error https://github.com/elastic/kibana/issues/95679
  kibanaTestUser,
  // @ts-expect-error https://github.com/elastic/kibana/issues/95679
  setupUsers,
} from '@kbn/test';
import { defaultsDeep, get } from 'lodash';
import { resolve } from 'path';
import { BehaviorSubject } from 'rxjs';
import supertest from 'supertest';

import { InternalCoreSetup, InternalCoreStart } from '../server/internal_types';
import { LegacyAPICaller } from '../server/elasticsearch';
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
  logging: { silent: true },
  plugins: {},
  migrations: { skip: false },
};

const DEFAULT_SETTINGS_WITH_CORE_PLUGINS = {
  plugins: { scanDirs: [resolve(__dirname, '../../legacy/core_plugins')] },
  elasticsearch: {
    hosts: [esTestConfig.getUrl()],
    username: kibanaServerTestUser.username,
    password: kibanaServerTestUser.password,
  },
};

export function createRootWithSettings(
  settings: Record<string, any>,
  cliArgs: Partial<CliArgs> = {}
) {
  const env = Env.createDefault(REPO_ROOT, {
    configs: [],
    cliArgs: {
      dev: false,
      silent: false,
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
  const testUserCredentials = Buffer.from(`${kibanaTestUser.username}:${kibanaTestUser.password}`);
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

export interface TestElasticsearchServer {
  getStartTimeout: () => number;
  start: (esArgs: string[], esEnvVars: Record<string, string>) => Promise<void>;
  stop: () => Promise<void>;
  cleanup: () => Promise<void>;
  getClient: () => KibanaClient;
  getCallCluster: () => LegacyAPICaller;
  getUrl: () => string;
}

export interface TestElasticsearchUtils {
  stop: () => Promise<void>;
  es: TestElasticsearchServer;
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
    es?: {
      license: 'basic' | 'gold' | 'trial';
      [key: string]: any;
    };
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
  const license = get(settings, 'es.license', 'basic');
  const usersToBeAdded = get(settings, 'users', []);
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

  log.indent(6);
  log.info('starting elasticsearch');
  log.indent(4);

  const es = createLegacyEsTestCluster(
    defaultsDeep({}, get(settings, 'es', {}), {
      log,
      license,
      password: license === 'trial' ? DEFAULT_SUPERUSER_PASS : undefined,
    })
  );

  log.indent(-4);

  // Add time for KBN and adding users
  adjustTimeout(es.getStartTimeout() + 100000);

  const kbnSettings: any = get(settings, 'kbn', {});

  return {
    startES: async () => {
      await es.start(get(settings, 'es.esArgs', []));

      if (['gold', 'trial'].includes(license)) {
        await setupUsers({
          log,
          esPort: esTestConfig.getUrlParts().port,
          updates: [
            ...usersToBeAdded,
            // user elastic
            esTestConfig.getUrlParts(),
            // user kibana
            kbnTestConfig.getUrlParts(),
          ],
        });

        // Override provided configs, we know what the elastic user is now
        kbnSettings.elasticsearch = {
          hosts: [esTestConfig.getUrl()],
          username: kibanaServerTestUser.username,
          password: kibanaServerTestUser.password,
        };
      }

      return {
        stop: async () => await es.cleanup(),
        es,
        hosts: [esTestConfig.getUrl()],
        username: kibanaServerTestUser.username,
        password: kibanaServerTestUser.password,
      };
    },
    startKibana: async () => {
      const root = createRootWithCorePlugins(kbnSettings);

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
