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
import type {
  HookHandler,
  HookResult,
  WorkflowsClient,
  WorkflowsClientProvider,
} from '@kbn/workflows/server/types';
import { registerGetStepDefinitionsRoute } from './routes/get_step_definitions';
import { registerGetTriggerDefinitionsRoute } from './routes/get_trigger_definitions';
import { ServerStepRegistry } from './step_registry';
import { registerInternalStepDefinitions } from './steps';
import { HookHandlerRegistry, TriggerRegistry } from './trigger_registry';
import { invokeHookInternal } from './trigger_registry/invoke_hook_internal';
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
  private readonly hookHandlerRegistry: HookHandlerRegistry;
  // Short-lived store keyed by sessionId, set before handlers run and deleted in finally.
  // Lets YAML step executors look up call-scoped capabilities (e.g. AnonymizationContext)
  // without them appearing in the YAML event payload.
  // Known limitation: concurrent calls sharing the same sessionId on one node race on this
  // map. Benign for the POC (Agent Builder drives sequential calls). Fix: thread context
  // through the workflow engine's per-execution context (Phase 2).
  private readonly sessionCapabilityCache = new Map<string, Record<string, unknown>>();
  private workflowsClientProvider: WorkflowsClientProvider | undefined;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.stepRegistry = new ServerStepRegistry(this.logger);
    this.triggerRegistry = new TriggerRegistry();
    this.hookHandlerRegistry = new HookHandlerRegistry();
  }

  public setup(
    core: CoreSetup<WorkflowsExtensionsServerPluginStartDeps>,
    _plugins: WorkflowsExtensionsServerPluginSetupDeps
  ): WorkflowsExtensionsServerPluginSetup {
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
      registerHookHandler: (triggerId: string, handler: HookHandler) => {
        this.hookHandlerRegistry.register(triggerId, handler);
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
      invokeHook: (
        triggerId: string,
        payload: Record<string, unknown>,
        capabilities?: Record<string, unknown>
      ): Promise<HookResult> => {
        return this.invokeHookInternal(triggerId, payload, capabilities);
      },
      getSessionCapabilities: (sessionId: string): Record<string, unknown> | undefined => {
        return this.sessionCapabilityCache.get(sessionId);
      },
      setSessionCapabilities: (sessionId: string, capabilities: Record<string, unknown>): void => {
        this.sessionCapabilityCache.set(sessionId, capabilities);
      },
      clearSessionCapabilities: (sessionId: string): void => {
        this.sessionCapabilityCache.delete(sessionId);
      },
    };
  }

  private invokeHookInternal(
    triggerId: string,
    payload: Record<string, unknown>,
    capabilities?: Record<string, unknown>
  ): Promise<HookResult> {
    return invokeHookInternal(
      {
        triggerRegistry: this.triggerRegistry,
        hookHandlerRegistry: this.hookHandlerRegistry,
        sessionCapabilityCache: this.sessionCapabilityCache,
        logger: this.logger,
      },
      triggerId,
      payload,
      capabilities
    );
  }

  public stop() {}

  // Fallback when workflowsManagement plugin is not enabled — should not happen in practice.
  private getNoopWorkflowsClient(): WorkflowsClient {
    return {
      isWorkflowsAvailable: false,
      emitEvent: async () => {
        this.logger.warn(
          'No workflows client provider set, using noop emitEvent to avoid errors. Trigger event ignored.'
        );
      },
      invokeHook: async (_triggerId, payload) => {
        this.logger.warn(
          'No workflows client provider set, using noop invokeHook. Hook call is a pass-through.'
        );
        return { status: 'pass_through', output: payload };
      },
    };
  }
}
