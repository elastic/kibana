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
  CustomRequestHandlerContext,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { emitEvent } from './emit_event';
import { registerGetStepDefinitionsRoute } from './routes/get_step_definitions';
import { registerGetTriggerDefinitionsRoute } from './routes/get_trigger_definitions';
import { ServerStepRegistry } from './step_registry';
import { registerInternalStepDefinitions } from './steps';
import { TriggerRegistry } from './trigger_registry';
import type {
  EmitEventParams,
  TriggerEventHandler,
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginSetupDeps,
  WorkflowsExtensionsServerPluginStart,
  WorkflowsExtensionsServerPluginStartDeps,
  WorkflowsRouteHandlerContext,
} from './types';

type WorkflowsExtensionsRequestHandlerContext = CustomRequestHandlerContext<{
  workflows: WorkflowsRouteHandlerContext;
}>;

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
  private triggerEventHandler: TriggerEventHandler | null = null;
  private emitEventFn: ((params: EmitEventParams) => Promise<void>) | null = null;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
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

    core.http.registerRouteHandlerContext<WorkflowsExtensionsRequestHandlerContext, 'workflows'>(
      'workflows',
      async (_context, request) => {
        const [, plugins] = await core.getStartServices();
        const spaceId = plugins.spaces?.spacesService.getSpaceId(request) ?? 'default';
        const emitEventFn = this.emitEventFn;
        if (!emitEventFn) {
          throw new Error('Workflows extensions plugin not started: emitEvent is not available.');
        }
        return {
          getWorkflowsClient: () => ({
            emitEvent: (triggerId: string, payload: Record<string, unknown>) =>
              emitEventFn({ triggerId, spaceId, payload, request }),
          }),
        };
      }
    );

    return {
      registerStepDefinition: (definition) => {
        this.stepRegistry.register(definition);
      },
      registerTriggerDefinition: (definition) => {
        this.triggerRegistry.register(definition);
      },
      registerTriggerEventHandler: (handler) => {
        if (this.triggerEventHandler !== null) {
          this.logger.warn(
            'A trigger event handler was already registered; it will be overwritten. Only one handler should register (e.g. workflows_management).'
          );
        }
        this.triggerEventHandler = handler;
      },
    };
  }

  public start(
    _core: CoreStart,
    _plugins: WorkflowsExtensionsServerPluginStartDeps
  ): WorkflowsExtensionsServerPluginStart {
    this.triggerRegistry.freeze();
    // Store so the route handler context provider (registered in setup) can call it when requests arrive.
    this.emitEventFn = (params: EmitEventParams) =>
      emitEvent(params, {
        triggerRegistry: this.triggerRegistry,
        triggerEventHandler: this.triggerEventHandler,
      });

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
      emitEvent: this.emitEventFn,
    };
  }

  public stop() {}
}
