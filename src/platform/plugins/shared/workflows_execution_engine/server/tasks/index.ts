/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionsTasksStart } from '@kbn/actions-plugin/server/tasks';
import type {
  CoreTasksSetup,
  CoreTasksStart,
  Logger,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import type { LicensingTasksStart } from '@kbn/licensing-plugin/server/tasks';
import type { SpacesTasksStart } from '@kbn/spaces-plugin/server/tasks';
import type {
  TaskManagerTasksSetup,
  TaskManagerTasksStart,
} from '@kbn/task-manager-plugin/server/tasks';
import type { WorkflowsExtensionsTasksStart } from '@kbn/workflows-extensions/server/tasks';
import { workflowsExecutionEngineBridge } from './bridge';
import type { ConcurrencyManager } from '../concurrency/concurrency_manager';
import type { WorkflowsExecutionEngineConfig } from '../config';
import { config as engineConfig } from '../config';
import { createScopedRepositories, createWorkflowsEngineRuntime } from '../engine_runtime';
import { WorkflowExecutionTelemetryClient } from '../lib/telemetry/workflow_execution_telemetry_client';
import type { DataClientBundle } from '../repositories/data_access_layer';
import { createDataClientBundle } from '../repositories/data_access_layer';
import { initializeLogsRepositoryDataStream } from '../repositories/logs_repository/data_stream';
import { checkConcurrencyIfNeeded, getConcurrencyGroupKey } from '../scheduling';
import { registerWorkflowTaskDefinitions } from '../task_runners';
import { initializeTriggerEventsDataStream } from '../trigger_events';
import type {
  InternalResumeWorkflowExecution,
  WorkflowsExecutionEnginePluginStart,
} from '../types';

export const config = engineConfig;

interface TasksSetupDeps {
  taskManager: TaskManagerTasksSetup;
}

interface TasksStartDeps {
  taskManager: TaskManagerTasksStart;
  licensing: LicensingTasksStart;
  spaces: SpacesTasksStart;
  workflowsExtensions: WorkflowsExtensionsTasksStart;
  actions: ActionsTasksStart;
}

/** The engine's own contract: the same scheduling, execution, cancellation and trigger events. */
export type WorkflowsExecutionEngineTasksStart = WorkflowsExecutionEnginePluginStart;

/**
 * The workflows engine for task runtimes: the `workflow:run`, `workflow:resume` and
 * `workflow:scheduled` task types, and the engine they run on, built from the same parts the plugin
 * uses (`task_runners`, `engine_runtime`). In Kibana the plugin owns both and a task runtime
 * sees its contract through the bridge. Not supported in a task pod: steps that call Kibana over
 * HTTP, and workflows that run as a service account.
 */
class WorkflowsExecutionEngineTasksPlugin
  implements
    TasksPlugin<void, Promise<WorkflowsExecutionEngineTasksStart>, TasksSetupDeps, TasksStartDeps>
{
  private readonly logger: Logger;
  private readonly config: WorkflowsExecutionEngineConfig;
  private dataClientBundle?: DataClientBundle;
  private concurrencyManager?: ConcurrencyManager;
  private internalResumeWorkflowExecution?: InternalResumeWorkflowExecution;

  private getConcurrencyManager() {
    if (!this.concurrencyManager) throw new Error('The workflows engine is not started');
    return this.concurrencyManager;
  }

  constructor(context: PluginInitializerContext<WorkflowsExecutionEngineConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
  }

  setup(core: CoreTasksSetup, { taskManager }: TasksSetupDeps) {
    if (workflowsExecutionEngineBridge.getSetup()) return;

    const { logger, config: engineSettings } = { logger: this.logger, config: this.config };
    WorkflowExecutionTelemetryClient.setup(core.analytics as never);
    initializeLogsRepositoryDataStream(core.dataStreams as never);
    initializeTriggerEventsDataStream(core.dataStreams as never);
    const dataClientBundle = createDataClientBundle({
      source: engineSettings.storage.source,
      dataRetention: engineSettings.storage.dataRetention,
      logger,
    });
    this.dataClientBundle = dataClientBundle;
    void dataClientBundle.initSetup(core as never);

    registerWorkflowTaskDefinitions({
      logger,
      config: engineSettings,
      registerTaskDefinitions: taskManager.registerTaskDefinitions,
      // The task runners read the same services from here as in Kibana.
      getStartServices: core.getStartServices as never,
      setupDependencies: { cloudSetup: undefined },
      meteringService: undefined,
      createScopedRepositories: () => createScopedRepositories(dataClientBundle),
      getInternalResumeWorkflowExecution: () => this.internalResumeWorkflowExecution,
      getConcurrencyGroupKey: (workflowExecution, workflowSettings, coreStart, dependencies) =>
        getConcurrencyGroupKey(
          { concurrencyManager: this.getConcurrencyManager(), logger },
          workflowExecution,
          workflowSettings,
          coreStart,
          dependencies
        ),
      checkConcurrencyIfNeeded: (workflowExecution) =>
        checkConcurrencyIfNeeded(
          { concurrencyManager: this.getConcurrencyManager(), logger },
          workflowExecution
        ),
    });
  }

  async start(
    core: CoreTasksStart,
    { taskManager, licensing, spaces, workflowsExtensions, actions }: TasksStartDeps
  ): Promise<WorkflowsExecutionEngineTasksStart> {
    const real = workflowsExecutionEngineBridge.getStart();
    if (real) return real;

    const dataClientBundle = this.dataClientBundle;
    if (!dataClientBundle) throw new Error('The workflows engine tasks entry was not set up');
    await dataClientBundle.initStart(core as never);

    // The engine runs workflows inline through its own contract, which exists once it is built.
    const engine: { contract?: WorkflowsExecutionEnginePluginStart } = {};
    const runtime = createWorkflowsEngineRuntime({
      logger: this.logger,
      config: this.config,
      coreStart: core as never,
      plugins: { licensing, taskManager, workflowsExtensions, actions, spaces } as never,
      dataClientBundle,
      setupDependencies: { cloudSetup: undefined },
      getEngine: async () => {
        if (!engine.contract) throw new Error('The workflows engine is not started');
        return engine.contract;
      },
    });
    engine.contract = runtime.contract;
    this.concurrencyManager = runtime.concurrencyManager;
    this.internalResumeWorkflowExecution = runtime.internalResumeWorkflowExecution;

    workflowsExtensions.bindRuntime({
      isWorkflowsAvailable: async () => (await licensing.getLicense()).hasAtLeast('enterprise'),
      emitEvent: (request, triggerId, payload) =>
        runtime.contract.triggerEvents.emitEvent({ triggerId, payload, request } as never),
    });

    return runtime.contract;
  }

  async stop() {
    await this.dataClientBundle?.stop();
  }
}

export const plugin = async (context: PluginInitializerContext<never>) =>
  new WorkflowsExecutionEngineTasksPlugin(context);
