/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { miniAppSavedObjectType } from './saved_objects';
import { defineRoutes } from './routes';
import { registerMiniAppTools, registerMiniAppAttachmentType } from './tools';
import type {
  MiniAppsServerPluginSetup,
  MiniAppsServerPluginStart,
  SetupDeps,
  StartDeps,
} from './types';
import type { MiniAppAttributes } from '../common';

export class MiniAppsPlugin
  implements Plugin<MiniAppsServerPluginSetup, MiniAppsServerPluginStart, SetupDeps, StartDeps>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup<StartDeps>, deps: SetupDeps) {
    this.logger.debug('Mini Apps: Setup');

    // Register the saved object type
    core.savedObjects.registerType<MiniAppAttributes>(miniAppSavedObjectType);

    // Create router and register routes
    const router = core.http.createRouter();
    defineRoutes(router, this.logger);

    // Register server-side tools and attachment type with the agent builder (if available)
    if (deps.agentBuilder) {
      registerMiniAppTools(deps.agentBuilder);
      registerMiniAppAttachmentType(deps.agentBuilder);
      this.logger.debug('Mini Apps: Registered agent builder tools and attachment type');
    }

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('Mini Apps: Start');
    return {};
  }

  public stop() {}
}
