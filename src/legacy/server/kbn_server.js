/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { constant, once, compact, flatten } from 'lodash';
import { reconfigureLogging } from '@kbn/legacy-logging';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { fromRoot, pkg } from '../../core/server/utils';
import { Config } from './config';
import httpMixin from './http';
import { coreMixin } from './core';
import { loggingMixin } from './logging';

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

        loggingMixin
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

    const { server } = this;

    if (process.env.isDevCliChild) {
      // help parent process know when we are ready
      process.send(['SERVER_LISTENING']);
    }

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

    const loggingConfig = config.get('logging');
    const opsConfig = config.get('ops');

    reconfigureLogging(this.server, loggingConfig, opsConfig.interval);
  }
}
