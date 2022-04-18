/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';

import { CustomIntegrationsPluginSetup, CustomIntegrationsPluginStart } from './types';
import { CustomIntegration } from '../common';
import { CustomIntegrationRegistry } from './custom_integration_registry';
import { defineRoutes } from './routes/define_routes';
import { registerLanguageClients } from './language_clients';

export class CustomIntegrationsPlugin
  implements Plugin<CustomIntegrationsPluginSetup, CustomIntegrationsPluginStart>
{
  private readonly logger: Logger;
  private readonly customIngegrationRegistry: CustomIntegrationRegistry;
  private readonly branch: string;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.customIngegrationRegistry = new CustomIntegrationRegistry(
      this.logger,
      initializerContext.env.mode.dev
    );
    this.branch = initializerContext.env.packageInfo.branch;
  }

  public setup(core: CoreSetup) {
    this.logger.debug('customIntegrations: Setup');

    const router = core.http.createRouter();
    defineRoutes(router, this.customIngegrationRegistry);

    registerLanguageClients(core, this.customIngegrationRegistry, this.branch);

    return {
      registerCustomIntegration: (integration: Omit<CustomIntegration, 'type'>) => {
        this.customIngegrationRegistry.registerCustomIntegration({
          type: 'ui_link',
          ...integration,
        });
      },
      getAppendCustomIntegrations: () => {
        return this.customIngegrationRegistry.getAppendCustomIntegrations();
      },
    } as CustomIntegrationsPluginSetup;
  }

  public start(core: CoreStart) {
    this.logger.debug('customIntegrations: Started');
    return {};
  }

  public stop() {}
}
