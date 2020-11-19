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

import { constant, once, compact, flatten } from 'lodash';
import { getLoggingConfiguration } from '@kbn/legacy-logging';

import { isWorker } from 'cluster';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { fromRoot, pkg } from '../../core/server/utils';
import { Config } from './config';
import httpMixin from './http';
import { coreMixin } from './core';
import { loggingMixin } from './logging';
import warningsMixin from './warnings';
import configCompleteMixin from './config/complete';
import { optimizeMixin } from '../../optimize';
import { uiMixin } from '../ui';

/**
 * @typedef {import('./kbn_server').KibanaConfig} KibanaConfig
 * @typedef {import('./kbn_server').KibanaCore} KibanaCore
 * @typedef {import('./kbn_server').LegacyPlugins} LegacyPlugins
 */

const rootDir = fromRoot('.');

export default class KbnServer {
  /**
   * @param {Record<string, any>} settings
   * @param {KibanaConfig} config
   * @param {KibanaCore} core
   */
  constructor(settings, config, core) {
    this.name = pkg.name;
    this.version = pkg.version;
    this.build = pkg.build || false;
    this.rootDir = rootDir;
    this.settings = settings || {};
    this.config = config;

    const { setupDeps, startDeps, logger, __internals, env } = core;

    this.server = __internals.hapiServer;
    this.newPlatform = {
      env: {
        mode: env.mode,
        packageInfo: env.packageInfo,
      },
      __internals,
      coreContext: {
        logger,
      },
      setup: setupDeps,
      start: startDeps,
      stop: null,
    };

    this.ready = constant(
      this.mixin(
        // Sets global HTTP behaviors
        httpMixin,

        coreMixin,

        loggingMixin,
        warningsMixin,

        // tell the config we are done loading plugins
        configCompleteMixin,

        uiMixin,

        // setup routes that serve the @kbn/optimizer output
        optimizeMixin
      )
    );

    this.listen = once(this.listen);
  }

  /**
   * Extend the KbnServer outside of the constraints of a plugin. This allows access
   * to APIs that are not exposed (intentionally) to the plugins and should only
   * be used when the code will be kept up to date with Kibana.
   *
   * @param {...function} - functions that should be called to mixin functionality.
   *                         They are called with the arguments (kibana, server, config)
   *                         and can return a promise to delay execution of the next mixin
   * @return {Promise} - promise that is resolved when the final mixin completes.
   */
  async mixin(...fns) {
    for (const fn of compact(flatten(fns))) {
      await fn.call(this, this, this.server, this.config);
    }
  }

  /**
   * Tell the server to listen for incoming requests, or get
   * a promise that will be resolved once the server is listening.
   *
   * @return undefined
   */
  async listen() {
    await this.ready();

    const { server, config } = this;

    if (isWorker) {
      // help parent process know when we are ready
      process.send(['WORKER_LISTENING']);
    }

    server.log(
      ['listening', 'info'],
      `Server running at ${server.info.uri}${
        config.get('server.rewriteBasePath') ? config.get('server.basePath') : ''
      }`
    );

    return server;
  }

  async close() {
    if (!this.server) {
      return;
    }

    await this.server.stop();
  }

  async inject(opts) {
    if (!this.server) {
      await this.ready();
    }

    return await this.server.inject(opts);
  }

  applyLoggingConfiguration(settings) {
    const config = Config.withDefaultSchema(settings);
    const loggingOptions = getLoggingConfiguration(
      config.get('logging'),
      config.get('ops.interval')
    );
    const subset = {
      ops: config.get('ops'),
      logging: config.get('logging'),
    };
    const plain = JSON.stringify(subset, null, 2);
    this.server.log(['info', 'config'], 'New logging configuration:\n' + plain);
    this.server.plugins['@elastic/good'].reconfigure(loggingOptions);
  }
}
