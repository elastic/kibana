/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type {
  KibanaRequest,
  Logger,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import type { WorkflowsClient } from '@kbn/workflows/server/types';
import { workflowsExtensionsBridge } from './bridge';
import { ServerStepRegistry } from '../step_registry';
import { registerInternalStepDefinitions } from '../steps';
import { TriggerRegistry } from '../trigger_registry';
import { registerInternalTriggerDefinitions } from '../triggers';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '../types';

/**
 * What a workflows runtime provides to `getClient(request).emitEvent` and `isWorkflowsAvailable`.
 * The execution engine's tasks entry binds it at start.
 */
export interface WorkflowsTriggerRuntime {
  isWorkflowsAvailable: () => Promise<boolean>;
  emitEvent: (request: KibanaRequest, triggerId: string, payload: unknown) => Promise<void>;
}

/**
 * Workflows extensions for task runtimes: the step and trigger registries. Steps and triggers are
 * registered by the tasks entries of the plugins that own them, as the plugins' `server` entries do in
 * Kibana, where this is the plugin's own registry (see `bridge.ts`). UI and managed-workflow
 * registration belong to Kibana, so those are no-ops here.
 */
export type WorkflowsExtensionsTasksSetup = Pick<
  WorkflowsExtensionsServerPluginSetup,
  'registerStepDefinition' | 'registerTriggerDefinition' | 'registerManagedWorkflowOwner'
>;

export type WorkflowsExtensionsTasksStart = Pick<
  WorkflowsExtensionsServerPluginStart,
  | 'getStepDefinition'
  | 'hasStepDefinition'
  | 'getAllStepDefinitions'
  | 'getTriggerDefinition'
  | 'getAllTriggerDefinitions'
  | 'isReady'
> & {
  getClient: (
    request: KibanaRequest
  ) => Promise<Pick<WorkflowsClient, 'isWorkflowsAvailable' | 'emitEvent'>>;
  /** Called once by the workflows runtime that answers `getClient`; a no-op where Kibana answers. */
  bindRuntime: (runtime: WorkflowsTriggerRuntime) => void;
};

class WorkflowsExtensionsTasksPlugin
  implements TasksPlugin<WorkflowsExtensionsTasksSetup, WorkflowsExtensionsTasksStart>
{
  private readonly logger: Logger;
  private readonly stepRegistry: ServerStepRegistry;
  // Definitions are registered at setup (by the tasks that use them) and read at start.
  private readonly triggerRegistry = new TriggerRegistry();
  private runtime?: WorkflowsTriggerRuntime;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.stepRegistry = new ServerStepRegistry(this.logger);
  }

  setup(): WorkflowsExtensionsTasksSetup {
    const real = workflowsExtensionsBridge.getSetup();
    if (real) return real;

    registerInternalStepDefinitions(this.stepRegistry);
    registerInternalTriggerDefinitions(this.triggerRegistry);
    return {
      registerStepDefinition: (definition) => this.stepRegistry.register(definition),
      registerTriggerDefinition: (definition) => this.triggerRegistry.register(definition),
      registerManagedWorkflowOwner: () => undefined,
    };
  }

  start(): WorkflowsExtensionsTasksStart {
    const real = workflowsExtensionsBridge.getStart();
    if (real) return { ...real, bindRuntime: () => undefined };

    this.triggerRegistry.freeze();
    const getRuntime = () => {
      if (!this.runtime) throw new Error('The workflows runtime is not started');
      return this.runtime;
    };
    return {
      getStepDefinition: (id) => this.stepRegistry.get(id),
      hasStepDefinition: (id) => this.stepRegistry.has(id),
      getAllStepDefinitions: () => this.stepRegistry.getAll(),
      getTriggerDefinition: (id) => this.triggerRegistry.get(id),
      getAllTriggerDefinitions: () => this.triggerRegistry.list(),
      isReady: async () => {
        await this.stepRegistry.whenReady();
      },
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

export const plugin = async (context: PluginInitializerContext) =>
  new WorkflowsExtensionsTasksPlugin(context);
