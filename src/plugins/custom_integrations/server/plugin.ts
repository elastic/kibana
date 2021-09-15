/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from 'kibana/server';

import { CustomIntegrationsPluginSetup, CustomIntegrationsPluginStart } from './types';
import { CustomIntegration, CategoryCount } from '../common';
import { CustomIntegrationRegistry } from './custom_integration_registry';

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
    return {
      registerCustomIntegration: (integration: CustomIntegration) => {
        this.customIngegrationRegistry.registerCustomIntegration(integration);
      },
      getAddableCustomIntegrations: (): CustomIntegration[] => {
        return this.customIngegrationRegistry.getAddableCustomIntegrations();
      },

      getAddableCategories: (): CategoryCount[] => {
        return this.customIngegrationRegistry.getAddableCategories();
      },
      getReplaceableCustomIntegrations: (): CustomIntegration[] => {
        return this.customIngegrationRegistry.getReplaceableCustomIntegrations();
      },
    } as CustomIntegrationsPluginSetup;
  }

  public start(core: CoreStart) {
    this.logger.debug('customIntegrations: Started');
    return {};
  }

  public stop() {}
}
