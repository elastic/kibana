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
import { registerGetTriggerDefinitionsRoute } from './routes/get_trigger_definitions';
import { ServerStepRegistry } from './step_registry';
import { registerInternalStepDefinitions } from './steps';
import { TriggerRegistry } from './trigger_registry';
import { emitEvent } from './emit_event';
import type {
  TriggerEventHandler,
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
  private readonly triggerRegistry: TriggerRegistry;
  private triggerEventHandler: TriggerEventHandler | null = null;

  constructor(_initializerContext: PluginInitializerContext) {
    this.stepRegistry = new ServerStepRegistry();
    this.triggerRegistry = new TriggerRegistry();
  }

  public setup(
    core: CoreSetup<WorkflowsExtensionsServerPluginStartDeps>,
    _plugins: WorkflowsExtensionsServerPluginSetupDeps
  ): WorkflowsExtensionsServerPluginSetup {
    const router = core.http.createRouter();

    // Register HTTP route to expose step definitions for testing
    registerGetStepDefinitionsRoute(router, this.stepRegistry);
    // Register HTTP route to expose trigger definitions for testing
    registerGetTriggerDefinitionsRoute(router, this.triggerRegistry);
    registerInternalStepDefinitions(core, this.stepRegistry);

    return {
      registerStepDefinition: (definition) => {
        this.stepRegistry.register(definition);
      },
      registerTriggerDefinition: (definition) => {
        this.triggerRegistry.register(definition);
      },
      registerTriggerEventHandler: (handler) => {
        this.triggerEventHandler = handler;
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
      emitEvent: (params: { triggerId: string; spaceId: string; payload: Record<string, unknown> }) =>
        emitEvent(params, {
          triggerRegistry: this.triggerRegistry,
          triggerEventHandler: this.triggerEventHandler,
        }),
    };
  }

  public stop() {}
}
