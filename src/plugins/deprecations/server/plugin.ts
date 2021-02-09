/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from 'src/core/server';

import { DeprecationsPluginSetup, DeprecationsPluginStart } from './types';
import { setupRoutes } from './routes';
import { Deprecations } from './deprecations';

export class DeprecationsPlugin
  implements Plugin<DeprecationsPluginSetup, DeprecationsPluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('deprecations: Setup');

    const deprecations = new Deprecations();
    const router = core.http.createRouter();

    // Register server side APIs
    setupRoutes({ router, deprecations });

    return deprecations;
  }

  public start(core: CoreStart) {
    this.logger.debug('deprecations: Started');
    return {};
  }

  public stop() {
    this.logger.debug('Stopping plugin');
  }
}
