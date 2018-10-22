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

import { ToolingLog } from '@kbn/dev-utils';
// @ts-ignore: implicit any for JS file
import { createEsTestCluster, esTestConfig, kibanaServerTestUser, kibanaTestUser } from '@kbn/test';
import { defaultsDeep } from 'lodash';
import { resolve } from 'path';
import { BehaviorSubject } from 'rxjs';
import supertest from 'supertest';
import { Env } from '../core/server/config';
import { LegacyObjectToConfigAdapter } from '../core/server/legacy_compat';
import { Root } from '../core/server/root';

type HttpMethod = 'delete' | 'get' | 'head' | 'post' | 'put';

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
  plugins: { scanDirs: [resolve(__dirname, '../core_plugins')] },
  elasticsearch: {
    url: esTestConfig.getUrl(),
    username: kibanaServerTestUser.username,
    password: kibanaServerTestUser.password,
  },
};

export function createRootWithSettings(...settings: Array<Record<string, any>>) {
  const env = Env.createDefault({
    configs: [],
    cliArgs: {
      dev: false,
      quiet: false,
      silent: false,
      watch: false,
      repl: false,
      basePath: false,
      optimize: false,
    },
    isDevClusterMaster: false,
  });

  return new Root(
    new BehaviorSubject(
      new LegacyObjectToConfigAdapter(defaultsDeep({}, ...settings, DEFAULTS_SETTINGS))
    ),
    env
  );
}

/**
 * Returns supertest request attached to the core's internal native Node server.
 * @param root
 * @param method
 * @param path
 */
function getSupertest(root: Root, method: HttpMethod, path: string) {
  const testUserCredentials = new Buffer(`${kibanaTestUser.username}:${kibanaTestUser.password}`);
  return supertest((root as any).server.http.service.httpServer.server.listener)
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
export function createRoot(settings = {}) {
  return createRootWithSettings(settings);
}

/**
 *  Creates an instance of Root, including all of the core plugins,
 *  with default configuration tailored for unit tests.
 *
 *  @param {Object} [settings={}] Any config overrides for this instance.
 *  @returns {Root}
 */
export function createRootWithCorePlugins(settings = {}) {
  return createRootWithSettings(settings, DEFAULT_SETTINGS_WITH_CORE_PLUGINS);
}

/**
 * Returns `kbnServer` instance used in the "legacy" Kibana.
 * @param root
 */
export function getKbnServer(root: Root) {
  return (root as any).server.legacy.service.kbnServer;
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

/**
 * Creates an instance of the Root, including all of the core "legacy" plugins,
 * with default configuration tailored for unit tests, and starts es.
 *
 * @param options
 * @prop settings Any config overrides for this instance.
 * @prop adjustTimeout A function(t) => this.timeout(t) that adjust the timeout of a
 * test, ensuring the test properly waits for the server to boot without timing out.
 */
export async function startTestServers({
  adjustTimeout,
  settings = {},
}: {
  adjustTimeout: (timeout: number) => void;
  settings: Record<string, any>;
}) {
  if (!adjustTimeout) {
    throw new Error('adjustTimeout is required in order to avoid flaky tests');
  }

  const log = new ToolingLog({
    level: 'debug',
    writeTo: process.stdout,
  });

  log.indent(6);
  log.info('starting elasticsearch');
  log.indent(4);

  const es = createEsTestCluster({ log });

  log.indent(-4);

  adjustTimeout(es.getStartTimeout());

  await es.start();

  const root = createRootWithCorePlugins(settings);
  await root.start();

  const kbnServer = getKbnServer(root);
  await kbnServer.server.plugins.elasticsearch.waitUntilReady();

  return {
    kbnServer,
    root,
    es,

    async stop() {
      await root.shutdown();
      await es.cleanup();
    },
  };
}
