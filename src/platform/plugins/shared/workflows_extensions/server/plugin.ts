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
import type { WorkflowsClient, WorkflowsClientProvider } from '@kbn/workflows/server/types';
import { registerGetStepDefinitionsRoute } from './routes/get_step_definitions';
import { registerGetTriggerDefinitionsRoute } from './routes/get_trigger_definitions';
import { ServerStepRegistry } from './step_registry';
import { registerInternalStepDefinitions } from './steps';
import { TriggerRegistry } from './trigger_registry';
import { registerInternalTriggerDefinitions } from './triggers';
import type {
  WorkflowsExtensionsRequestHandlerContext,
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginSetupDeps,
  WorkflowsExtensionsServerPluginStart,
  WorkflowsExtensionsServerPluginStartDeps,
} from './types';

export class WorkflowsExtensionsServerPlugin
  implements
    Plugin<
      WorkflowsExtensionsServerPluginSetup,
      WorkflowsExtensionsServerPluginStart,
      WorkflowsExtensionsServerPluginSetupDeps,
      WorkflowsExtensionsServerPluginStartDeps
    >
{
  private readonly logger: Logger;
  private readonly stepRegistry: ServerStepRegistry;
  private readonly triggerRegistry: TriggerRegistry;
  private workflowsClientProvider: WorkflowsClientProvider | undefined;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.stepRegistry = new ServerStepRegistry(this.logger);
    this.triggerRegistry = new TriggerRegistry();
  }

  public setup(
    core: CoreSetup<WorkflowsExtensionsServerPluginStartDeps>,
    _plugins: WorkflowsExtensionsServerPluginSetupDeps
  ): WorkflowsExtensionsServerPluginSetup {
    // Register the workflows client provider to the workflows request context
    core.http.registerRouteHandlerContext<WorkflowsExtensionsRequestHandlerContext, 'workflows'>(
      'workflows',
      (_context, request) => {
        if (!this.workflowsClientProvider) {
          return this.getNoopWorkflowsClient();
        }
        return this.workflowsClientProvider(request);
      }
    );

    const router = core.http.createRouter();

    registerGetStepDefinitionsRoute(router, this.stepRegistry);
    registerGetTriggerDefinitionsRoute(router, this.triggerRegistry);

    registerInternalStepDefinitions(core, this.stepRegistry);
    registerInternalTriggerDefinitions(this.triggerRegistry);

    return {
      registerStepDefinition: (definition) => {
        this.stepRegistry.register(definition);
      },
      registerTriggerDefinition: (definition) => {
        this.triggerRegistry.register(definition);
      },
      registerWorkflowsClientProvider: (provider) => {
        if (this.workflowsClientProvider) {
          throw new Error('Workflows client provider already set');
        }
        this.workflowsClientProvider = provider;
      },
    };
  }

  public start(
    _core: CoreStart,
    _plugins: WorkflowsExtensionsServerPluginStartDeps
  ): WorkflowsExtensionsServerPluginStart {
    this.triggerRegistry.freeze();

    return {
      getStepDefinition: (stepTypeId: string) => {
        return this.stepRegistry.get(stepTypeId);
      },
      hasStepDefinition: (stepTypeId: string) => {
        return this.stepRegistry.has(stepTypeId);
      },
      getAllStepDefinitions: () => {
        return this.stepRegistry.getAll();
      },
      getAllTriggerDefinitions: () => {
        return this.triggerRegistry.list();
      },
      getTriggerDefinition: (triggerId: string) => {
        return this.triggerRegistry.get(triggerId);
      },
      isReady: async () => {
        await this.stepRegistry.whenReady();
      },
      getClient: async (request) => {
        if (!this.workflowsClientProvider) {
          return this.getNoopWorkflowsClient();
        }
        return this.workflowsClientProvider(request);
      },
    };
  }

  public stop() {}

  /**
   * Returns a noop workflows client to avoid errors when the workflows client provider is not set.
   * This scenario should never happen, but it's a fallback to avoid errors in case not all workflows plugins are enabled.
   * @returns A noop workflows client
   */
  private getNoopWorkflowsClient(): WorkflowsClient {
    return {
      isWorkflowsAvailable: false,
      emitEvent: async () => {
        this.logger.warn(
          'No workflows client provider set, using noop emitEvent to avoid errors. Trigger event ignored.'
        );
      },
    };
  }
}
