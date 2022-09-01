/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';

import { PluginBPluginSetup, PluginBPluginStart } from './types';
import { defineRoutes } from './routes';
import { rpc } from './rpc';

export class PluginBPlugin implements Plugin<PluginBPluginSetup, PluginBPluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('plugin_b: Setup');
    const router = core.http.createRouter();
    core.http.registerRPCDefinition(rpc);

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('plugin_b: Started');
    return {};
  }

  public stop() {}
}
