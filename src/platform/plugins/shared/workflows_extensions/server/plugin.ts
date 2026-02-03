/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { registerGetStepDefinitionsRoute } from './routes/get_step_definitions';
import { ServerStepRegistry } from './step_registry';
import { ServerTriggerRegistry } from './trigger_registry';
import { registerInternalStepDefinitions } from './steps';
import { registerInternalTriggerDefinitions } from './triggers';
import type {
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
  private readonly stepRegistry: ServerStepRegistry;
  private readonly triggerRegistry: ServerTriggerRegistry;

  constructor(_initializerContext: PluginInitializerContext) {
    this.stepRegistry = new ServerStepRegistry();
    this.triggerRegistry = new ServerTriggerRegistry();
  }

  public setup(
    core: CoreSetup<WorkflowsExtensionsServerPluginStartDeps>,
    _plugins: WorkflowsExtensionsServerPluginSetupDeps
  ): WorkflowsExtensionsServerPluginSetup {
    const router = core.http.createRouter();

    // Register HTTP route to expose step definitions for testing
    registerGetStepDefinitionsRoute(router, this.stepRegistry);
    registerInternalStepDefinitions(core, this.stepRegistry);

    // Register internal trigger definitions (e.g., streams.upsertStream)
    registerInternalTriggerDefinitions(this.triggerRegistry);

    return {
      registerStepDefinition: (definition) => {
        this.stepRegistry.register(definition);
      },
      registerTriggerDefinition: (definition) => {
        this.triggerRegistry.register(definition);
      },
    };
  }

  public start(
    _core: CoreStart,
    _plugins: WorkflowsExtensionsServerPluginStartDeps
  ): WorkflowsExtensionsServerPluginStart {
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
      getTriggerDefinition: (triggerTypeId: string) => {
        return this.triggerRegistry.get(triggerTypeId);
      },
      hasTriggerDefinition: (triggerTypeId: string) => {
        return this.triggerRegistry.has(triggerTypeId);
      },
      getAllTriggerDefinitions: () => {
        return this.triggerRegistry.getAll();
      },
    };
  }

  public stop() {}
}
