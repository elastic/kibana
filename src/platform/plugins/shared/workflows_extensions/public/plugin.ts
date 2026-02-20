/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { PublicStepRegistry } from './step_registry';
import { registerInternalStepDefinitions } from './steps';
import { PublicTriggerRegistry } from './trigger_registry';
import type {
  WorkflowsExtensionsPublicPluginSetup,
  WorkflowsExtensionsPublicPluginSetupDeps,
  WorkflowsExtensionsPublicPluginStart,
  WorkflowsExtensionsPublicPluginStartDeps,
} from './types';

export class WorkflowsExtensionsPublicPlugin
  implements
    Plugin<
      WorkflowsExtensionsPublicPluginSetup,
      WorkflowsExtensionsPublicPluginStart,
      WorkflowsExtensionsPublicPluginSetupDeps,
      WorkflowsExtensionsPublicPluginStartDeps
    >
{
  private readonly stepRegistry: PublicStepRegistry;
  private readonly triggerRegistry: PublicTriggerRegistry;

  constructor(_initializerContext: PluginInitializerContext) {
    this.stepRegistry = new PublicStepRegistry();
    this.triggerRegistry = new PublicTriggerRegistry();
  }

  public setup(
    _core: CoreSetup,
    _plugins: WorkflowsExtensionsPublicPluginSetupDeps
  ): WorkflowsExtensionsPublicPluginSetup {
    registerInternalStepDefinitions(this.stepRegistry);

    return {
      registerStepDefinition: (definition) => this.stepRegistry.register(definition),
      registerTriggerDefinition: (definition) => this.triggerRegistry.register(definition),
    };
  }

  public start(
    _core: CoreStart,
    _plugins: WorkflowsExtensionsPublicPluginStartDeps
  ): WorkflowsExtensionsPublicPluginStart {
    return {
      getAllStepDefinitions: () => {
        return this.stepRegistry.getAll();
      },
      getStepDefinition: (stepTypeId: string) => {
        return this.stepRegistry.get(stepTypeId);
      },
      hasStepDefinition: (stepTypeId: string) => {
        return this.stepRegistry.has(stepTypeId);
      },
      getAllTriggerDefinitions: () => {
        return this.triggerRegistry.getAll();
      },
      getTriggerDefinition: (triggerId: string) => {
        return this.triggerRegistry.get(triggerId);
      },
      hasTriggerDefinition: (triggerId: string) => {
        return this.triggerRegistry.has(triggerId);
      },
    };
  }

  public stop() {}
}
