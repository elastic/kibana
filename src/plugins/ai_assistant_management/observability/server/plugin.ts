/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { mapValues } from 'lodash';
import { registerServerRoutes } from './routes/register_routes';
import { AIAssistantManagementObservabilityRouteHandlerResources } from './routes/types';
import { AIAssistantManagementObservabilityService } from './service';
import { addLensDocsToKb } from './service/kb_service/kb_docs/lens';
import {
  AiAssistantManagementObservabilityPluginSetup,
  AiAssistantManagementObservabilityPluginSetupDependencies,
  AiAssistantManagementObservabilityPluginStart,
  AiAssistantManagementObservabilityPluginStartDependencies,
} from './types';

export class AiAssistantManagementObservabilityPlugin
  implements
    Plugin<
      AiAssistantManagementObservabilityPluginSetup,
      AiAssistantManagementObservabilityPluginStart,
      AiAssistantManagementObservabilityPluginSetupDependencies,
      AiAssistantManagementObservabilityPluginStartDependencies
    >
{
  private readonly logger: Logger;

  constructor(private readonly context: PluginInitializerContext) {
    this.logger = this.context.logger.get();
  }

  public setup(
    core: CoreSetup<
      AiAssistantManagementObservabilityPluginStartDependencies,
      AiAssistantManagementObservabilityPluginStart
    >,
    plugins: AiAssistantManagementObservabilityPluginSetupDependencies
  ) {
    this.logger.debug('Setting up AiAssistantManagement for Observability plugin');

    const service = new AIAssistantManagementObservabilityService({
      logger: this.logger.get('service'),
      core,
      taskManager: plugins.taskManager,
    });

    const routeHandlerPlugins = mapValues(plugins, (value, key) => {
      return {
        setup: value,
        start: () =>
          core.getStartServices().then((services) => {
            const [, pluginsStartContracts] = services;
            return pluginsStartContracts[
              key as keyof AiAssistantManagementObservabilityPluginStartDependencies
            ];
          }),
      };
    }) as AIAssistantManagementObservabilityRouteHandlerResources['plugins'];

    addLensDocsToKb({ service, logger: this.logger.get('kb').get('lens') });

    registerServerRoutes({
      core,
      logger: this.logger,
      dependencies: {
        plugins: routeHandlerPlugins,
        service,
      },
    });

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('Starting up AiAssistantManagement for Observability plugin');

    return {};
  }
}
