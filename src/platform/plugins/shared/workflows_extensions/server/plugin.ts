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
import { SPACES_TASK_PROCESS_SETTINGS_ID } from '@kbn/spaces-plugin/server/task_process_settings';
import type {
  ManagedWorkflowsSystemApi,
  ManagedWorkflowsSystemApiProvider,
  WorkflowsClient,
  WorkflowsClientProvider,
} from '@kbn/workflows/server/types';
import { createPluginScopedManagedWorkflowsClient } from './create_plugin_scoped_managed_workflows_client';
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
  private readonly managedWorkflowPluginIds = new Set<string>();
  private readonly taskProcessSettings: Record<string, () => unknown> = {};
  private readonly taskProcessParity: Record<string, () => string[]> = {};
  private workflowsClientProvider: WorkflowsClientProvider | undefined;
  private managedWorkflowsSystemApiProvider: ManagedWorkflowsSystemApiProvider | undefined;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.stepRegistry = new ServerStepRegistry(this.logger);
    this.triggerRegistry = new TriggerRegistry();
  }

  public setup(
    core: CoreSetup<WorkflowsExtensionsServerPluginStartDeps>,
    plugins: WorkflowsExtensionsServerPluginSetupDeps
  ): WorkflowsExtensionsServerPluginSetup {
    this.taskProcessSettings[SPACES_TASK_PROCESS_SETTINGS_ID] =
      plugins.spaces.getTaskProcessSettings;
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

    registerGetStepDefinitionsRoute(router, this.stepRegistry, this.logger);
    registerGetTriggerDefinitionsRoute(router, this.triggerRegistry);

    registerInternalStepDefinitions(this.stepRegistry);
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
      registerManagedWorkflowsSystemApiProvider: (provider) => {
        if (this.managedWorkflowsSystemApiProvider) {
          throw new Error('Managed workflows system API provider already set');
        }
        this.managedWorkflowsSystemApiProvider = provider;
      },
      registerManagedWorkflowOwner: (pluginId) => {
        if (!pluginId) {
          throw new Error('pluginId is required to register managed workflow owner');
        }
        this.managedWorkflowPluginIds.add(pluginId);
      },
      registerTaskProcessSettings: (pluginId, getSettings) => {
        this.taskProcessSettings[pluginId] = getSettings;
      },
      registerTaskProcessParity: (kind, getIds) => {
        this.taskProcessParity[kind] = getIds;
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
      initManagedWorkflowsClient: async (pluginId: string) => {
        if (!pluginId) {
          throw new Error('pluginId is required to initialize managed workflows client');
        }

        const systemClient = this.managedWorkflowsSystemApiProvider
          ? await this.managedWorkflowsSystemApiProvider(pluginId)
          : this.getNoopManagedWorkflowsSystemClient();

        return createPluginScopedManagedWorkflowsClient(pluginId, systemClient, async (request) =>
          this.workflowsClientProvider
            ? this.workflowsClientProvider(request)
            : this.getNoopWorkflowsClient()
        );
      },
      getTaskProcessSettings: () => this.taskProcessSettings,
      // Step and trigger definitions are deliberately narrowed by packs per task process, so they
      // are not sent here: nothing compares a process's own registrations against Kibana's full
      // registries for these two kinds (see the comment on `process_runtime.ts`'s `checkParity`).
      getTaskProcessParity: () => ({ ...this.taskProcessParity }),
      getManagedWorkflowPluginIds: () => Array.from(this.managedWorkflowPluginIds),
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
      managedWorkflows: {
        install: async () => {
          this.logger.warn(
            'No workflows client provider set, using noop managedWorkflows.install to avoid errors.'
          );
        },
        uninstall: async () => {
          this.logger.warn(
            'No workflows client provider set, using noop managedWorkflows.uninstall to avoid errors.'
          );
        },
        execute: async () => {
          this.logger.warn(
            'No workflows client provider set, using noop managedWorkflows.execute to avoid errors.'
          );
          throw new Error('Workflows client provider is not available');
        },
        getWorkflowStatus: async () => {
          this.logger.warn(
            'No workflows client provider set, using noop managedWorkflows.getWorkflowStatus to avoid errors.'
          );
          throw new Error('Workflows client provider is not available');
        },
      },
    };
  }

  private getNoopManagedWorkflowsSystemClient(): ManagedWorkflowsSystemApi {
    return {
      install: async () => {
        this.logger.warn(
          'No managed workflows system API provider set, using noop install to avoid errors.'
        );
      },
      uninstall: async () => {
        this.logger.warn(
          'No managed workflows system API provider set, using noop uninstall to avoid errors.'
        );
      },
      ready: async () => {
        this.logger.warn(
          'No managed workflows system API provider set, using noop ready to avoid errors.'
        );
      },
      getWorkflowStatus: async () => {
        this.logger.warn(
          'No managed workflows system API provider set, using noop getWorkflowStatus to avoid errors.'
        );
        throw new Error('Managed workflows system API provider is not available');
      },
      getInstalledWorkflowState: async () => {
        this.logger.warn(
          'No managed workflows system API provider set, using noop state read to avoid errors.'
        );
        throw new Error('Managed workflows system API provider is not available');
      },
      listInstalledWorkflowStates: async () => {
        this.logger.warn(
          'No managed workflows system API provider set, using noop state list to avoid errors.'
        );
        throw new Error('Managed workflows system API provider is not available');
      },
    };
  }
}
