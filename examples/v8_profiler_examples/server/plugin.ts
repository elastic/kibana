/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Plugin, Logger, CoreSetup, PluginInitializerContext } from '@kbn/core/server';

import { registerRoutes } from './routes';

// this plugin's dependencies
export class V8ProfilerExamplesPlugin implements Plugin<void, void> {
  readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    const router = core.http.createRouter();
    registerRoutes(this.logger, router);
  }

  public start() {}

  public stop() {}
}
