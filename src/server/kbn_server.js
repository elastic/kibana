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
import { fromNode } from 'bluebird';
import { isWorker } from 'cluster';
import { fromRoot, pkg } from '../utils';
import { Config } from './config';
import loggingConfiguration from './logging/configuration';
import configSetupMixin from './config/setup';
import httpMixin from './http';
import { loggingMixin } from './logging';
import warningsMixin from './warnings';
import { statusMixin } from './status';
import pidMixin from './pid';
import { configDeprecationWarningsMixin } from './config/deprecation_warnings';
import configCompleteMixin from './config/complete';
import optimizeMixin from '../optimize';
import * as Plugins from './plugins';
import { indexPatternsMixin } from './index_patterns';
import { savedObjectsMixin } from './saved_objects';
import { sampleDataMixin } from './sample_data';
import { kibanaIndexMappingsMixin } from './mappings';
import { serverExtensionsMixin } from './server_extensions';
import { uiMixin } from '../ui';

const rootDir = fromRoot('.');

export default class KbnServer {
  constructor(settings) {
    this.name = pkg.name;
    this.version = pkg.version;
    this.build = pkg.build || false;
    this.rootDir = rootDir;
    this.settings = settings || {};

    this.ready = constant(this.mixin(
      Plugins.waitForInitSetupMixin,

      // sets this.config, reads this.settings
      configSetupMixin,
      // sets this.server
      httpMixin,
      // adds methods for extending this.server
      serverExtensionsMixin,
      loggingMixin,
      configDeprecationWarningsMixin,
      warningsMixin,
      statusMixin,

      // writes pid file
      pidMixin,

      // find plugins and set this.plugins and this.pluginSpecs
      Plugins.scanMixin,

      // tell the config we are done loading plugins
      configCompleteMixin,

      // setup this.uiExports and this.uiBundles
      uiMixin,
      indexPatternsMixin,

      // setup server.getKibanaIndexMappingsDsl()
      kibanaIndexMappingsMixin,

      // setup saved object routes
      savedObjectsMixin,

      // setup routes for installing/uninstalling sample data sets
      sampleDataMixin,

      // ensure that all bundles are built, or that the
      // watch bundle server is running
      optimizeMixin,

      // initialize the plugins
      Plugins.initializeMixin,

      // notify any deffered setup logic that plugins have intialized
      Plugins.waitForInitResolveMixin,

      () => {
        if (this.config.get('server.autoListen')) {
          this.ready = constant(Promise.resolve());
          return this.listen();
        }
      }
    ));

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
    const {
      server,
      config,
    } = this;

    await this.ready();
    await fromNode(cb => server.start(cb));

    if (isWorker) {
      // help parent process know when we are ready
      process.send(['WORKER_LISTENING']);
    }

    server.log(['listening', 'info'], `Server running at ${server.info.uri}${
      config.get('server.rewriteBasePath')
        ? config.get('server.basePath')
        : ''
    }`);
    return server;
  }

  async close() {
    await fromNode(cb => this.server.stop(cb));
  }

  async inject(opts) {
    if (!this.server) {
      await this.ready();
    }

    return await this.server.inject(opts);
  }

  async applyLoggingConfiguration(settings) {
    const config = await Config.withDefaultSchema(settings);
    const loggingOptions = loggingConfiguration(config);
    const subset = {
      ops: config.get('ops'),
      logging: config.get('logging')
    };
    const plain = JSON.stringify(subset, null, 2);
    this.server.log(['info', 'config'], 'New logging configuration:\n' + plain);
    this.server.plugins['even-better'].monitor.reconfigure(loggingOptions);
  }
}
