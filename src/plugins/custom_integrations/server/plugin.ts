/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../core/server';

import {
  CustomIntegrationsPluginSetup,
  CustomIntegrationsPluginStart,
  CustomIntegration,
} from './types';
import { defineRoutes } from './routes';
import { CategoryCount, CustomIntegrationRegistry } from './custom_integration_registry';

export class CustomIntegrationsPlugin
  implements Plugin<CustomIntegrationsPluginSetup, CustomIntegrationsPluginStart> {
  private readonly logger: Logger;
  private readonly customIngegrationRegistry: CustomIntegrationRegistry;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.customIngegrationRegistry = new CustomIntegrationRegistry(this.logger);
  }

  public setup(core: CoreSetup) {
    this.logger.debug('customIntegrations: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {
      registerCustomIntegration: (integration: CustomIntegration) => {
        console.log('register custom!', integration);
        this.customIngegrationRegistry.registerCustomIntegration(integration);
      },
      getNonBeatsCustomIntegrations: (): CustomIntegration[] => {
        console.log('get the interations');
        return this.customIngegrationRegistry.getNonBeatsCustomIntegrations();
      },

      getNonBeatsCategories: (): CategoryCount[] => {
        console.log('get categories');
        return this.customIngegrationRegistry.getNonBeatsCategories();
      },
    } as CustomIntegrationsPluginSetup;
  }

  public start(core: CoreStart) {
    this.logger.debug('customIntegrations: Started');
    return {};
  }

  public stop() {}
}
