/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { CloudPipelinesConfig } from './config';
import { registerRoutes } from './routes';
import { StreamsWatcher } from './streams_watcher';

export class CloudPipelinesPlugin implements Plugin<{}, {}, {}, {}> {
  private readonly config: CloudPipelinesConfig;
  private readonly logger: Logger;
  private streamsWatcher?: StreamsWatcher;

  constructor(context: PluginInitializerContext) {
    this.config = context.config.get<CloudPipelinesConfig>();
    this.logger = context.logger.get();
  }

  setup({ http }: CoreSetup) {
    if (!this.config.enabled) {
      this.logger.info('Cloud Pipelines plugin is disabled');
      return {};
    }

    const router = http.createRouter();
    registerRoutes(router, this.config, this.logger);
    this.logger.info(
      `Cloud Pipelines plugin initialized, proxying to ${this.config.pipelinesConfigEndpoint}`
    );
    return {};
  }

  start(core: CoreStart) {
    if (!this.config.enabled) {
      return {};
    }

    this.streamsWatcher = new StreamsWatcher(
      core.elasticsearch.client.asInternalUser,
      this.config,
      this.logger.get('streamsWatcher')
    );
    this.streamsWatcher.start();

    return {};
  }

  async stop() {
    this.streamsWatcher?.stop();
  }
}
