/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, PluginInitializerContext, TasksPlugin } from '@kbn/core/server';
import { TriggerRegistry } from '../trigger_registry';

/**
 * What a workflows runtime provides to `getClient(request).emitEvent` and `isWorkflowsAvailable`.
 * The execution engine's tasks entry binds it at start.
 */
export interface WorkflowsTriggerRuntime {
  isWorkflowsAvailable: () => Promise<boolean>;
  emitEvent: (request: KibanaRequest, triggerId: string, payload: unknown) => Promise<void>;
}

/**
 * Workflows extensions for task runtimes: the trigger registry tasks emit events against. Step, UI
 * and managed-workflow registration belongs to Kibana's `server` entry, so those are no-ops here.
 */
export interface WorkflowsExtensionsTasksSetup {
  registerTriggerDefinition: TriggerRegistry['register'];
  registerStepDefinition: (definition: unknown) => void;
  registerManagedWorkflowOwner: (owner: unknown) => void;
}

export interface WorkflowsExtensionsTasksStart {
  getTriggerDefinition: TriggerRegistry['get'];
  getClient: (request: KibanaRequest) => Promise<{
    isWorkflowsAvailable: boolean;
    emitEvent: (triggerId: string, payload: unknown) => Promise<void>;
  }>;
  /** Called once by the workflows runtime that answers `getClient`. */
  bindRuntime: (runtime: WorkflowsTriggerRuntime) => void;
}

class WorkflowsExtensionsTasksPlugin
  implements TasksPlugin<WorkflowsExtensionsTasksSetup, WorkflowsExtensionsTasksStart>
{
  // Trigger definitions are registered at setup (by the tasks that emit them) and read at start.
  private readonly triggerRegistry = new TriggerRegistry();
  private runtime?: WorkflowsTriggerRuntime;

  setup(): WorkflowsExtensionsTasksSetup {
    return {
      registerTriggerDefinition: (definition) => this.triggerRegistry.register(definition),
      registerStepDefinition: () => undefined,
      registerManagedWorkflowOwner: () => undefined,
    };
  }

  start(): WorkflowsExtensionsTasksStart {
    this.triggerRegistry.freeze();
    const getRuntime = () => {
      if (!this.runtime) throw new Error('The workflows runtime is not started');
      return this.runtime;
    };
    return {
      getTriggerDefinition: (id) => this.triggerRegistry.get(id),
      getClient: async (request) => ({
        isWorkflowsAvailable: await getRuntime().isWorkflowsAvailable(),
        emitEvent: (triggerId, payload) => getRuntime().emitEvent(request, triggerId, payload),
      }),
      bindRuntime: (runtime) => {
        this.runtime = runtime;
      },
    };
  }
}

export const plugin = async (_context: PluginInitializerContext) =>
  new WorkflowsExtensionsTasksPlugin();
