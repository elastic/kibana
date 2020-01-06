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
import { Client } from 'elasticsearch';
import { ToolingLog } from '@kbn/dev-utils';
import {
  createLegacyEsTestCluster,
  DEFAULT_SUPERUSER_PASS,
  esTestConfig,
  kbnTestConfig,
  kibanaServerTestUser,
  kibanaTestUser,
  setupUsers,
  // @ts-ignore: implicit any for JS file
} from '@kbn/test';
import { defaultsDeep, get } from 'lodash';
import { resolve } from 'path';
import { BehaviorSubject } from 'rxjs';
import supertest from 'supertest';
import { CliArgs, Env } from '../core/server/config';
import { Root } from '../core/server/root';
import KbnServer from '../legacy/server/kbn_server';
import { CallCluster } from '../legacy/core_plugins/elasticsearch';

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
  optimize: { enabled: false },
};

const DEFAULT_SETTINGS_WITH_CORE_PLUGINS = {
  plugins: { scanDirs: [resolve(__dirname, '../legacy/core_plugins')] },
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
  const env = Env.createDefault({
    configs: [],
    cliArgs: {
      dev: false,
      open: false,
      quiet: false,
      silent: false,
      watch: false,
      repl: false,
      basePath: false,
      optimize: false,
      runExamples: false,
      oss: true,
      ...cliArgs,
    },
    isDevClusterMaster: false,
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

/**
 * Returns `kbnServer` instance used in the "legacy" Kibana.
 * @param root
 */
export function getKbnServer(root: Root): KbnServer {
  return (root as any).server.legacy.kbnServer;
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
  getClient: () => Client;
  getCallCluster: () => CallCluster;
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
  kbnServer: KbnServer;
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
      license: 'oss' | 'basic' | 'gold' | 'trial';
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
  const license = get<'oss' | 'basic' | 'gold' | 'trial'>(settings, 'es.license', 'oss');
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

      await root.setup();
      await root.start();

      const kbnServer = getKbnServer(root);
      await kbnServer.server.plugins.elasticsearch.waitUntilReady();

      return {
        root,
        kbnServer,
        stop: async () => await root.shutdown(),
      };
    },
  };
}
