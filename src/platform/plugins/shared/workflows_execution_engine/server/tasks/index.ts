/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CoreTasksStart,
  KibanaRequest,
  Logger,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import type { LicensingTasksStart } from '@kbn/licensing-plugin/server/tasks';
import type { SpacesTasksStart } from '@kbn/spaces-plugin/server/tasks';
import type { TaskManagerTasksStart } from '@kbn/task-manager-plugin/server/tasks';
import { WorkflowRepository } from '@kbn/workflows';
import type { WorkflowsExtensionsTasksStart } from '@kbn/workflows-extensions/server/tasks';
import { ConcurrencyManager } from '../concurrency/concurrency_manager';
import type { WorkflowsExecutionEngineConfig } from '../config';
import { config as engineConfig } from '../config';
import { createDataClientBundle } from '../repositories/data_access_layer';
import { StepExecutionRepository } from '../repositories/step_execution_repository';
import { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import {
  createBulkScheduleWorkflow,
  createScheduleWorkflow,
  createSchedulingHelpers,
} from '../scheduling';
import type { SchedulingDeps } from '../scheduling';
import { TriggerEventHandler } from '../trigger_events/trigger_event_handler';
import { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

export const config = engineConfig;

interface TasksStartDeps {
  taskManager: TaskManagerTasksStart;
  licensing: LicensingTasksStart;
  spaces: SpacesTasksStart;
  workflowsExtensions: WorkflowsExtensionsTasksStart;
}

export interface WorkflowsExecutionEngineTasksStart {
  /** Matches an event against workflows in Elasticsearch and schedules the ones that trigger. */
  emitEvent: (request: KibanaRequest, triggerId: string, payload: unknown) => Promise<void>;
  /** Same scheduling as the engine's `bulkScheduleWorkflow`. */
  bulkScheduleWorkflow: ReturnType<typeof createBulkScheduleWorkflow>;
}

/**
 * The scheduling half of the execution engine for task runtimes: trigger events are matched against
 * workflows in Elasticsearch and scheduled (executions written, a `workflow:run` task created
 * through the runtime's Task Manager), and workflows are bulk scheduled. It is the same code Kibana
 * runs, built from its parts; only the storage `plain_index` is supported. Running workflows (the
 * `workflow:run` task) stays on the node that claims the task.
 */
class WorkflowsExecutionEngineTasksPlugin
  implements TasksPlugin<void, Promise<WorkflowsExecutionEngineTasksStart>, {}, TasksStartDeps>
{
  private readonly logger: Logger;
  private readonly config: WorkflowsExecutionEngineConfig;

  constructor(context: PluginInitializerContext<WorkflowsExecutionEngineConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
  }

  setup() {}

  async start(
    core: CoreTasksStart,
    { taskManager, licensing, spaces, workflowsExtensions }: TasksStartDeps
  ): Promise<WorkflowsExecutionEngineTasksStart> {
    const { storage, eventDriven } = this.config;
    if (storage.source !== 'plain_index') {
      throw new Error(
        `xpack.workflowsExecutionEngine.storage.source '${storage.source}' is not supported in a task runtime: use 'plain_index'`
      );
    }
    const logger = this.logger;
    const esClient = core.elasticsearch.client.asInternalUser;

    const dataClientBundle = createDataClientBundle({
      source: storage.source,
      dataRetention: storage.dataRetention,
      logger,
    });
    await dataClientBundle.initSetup({} as never);
    await dataClientBundle.initStart(core as never);
    const workflowExecutionRepository = new WorkflowExecutionRepository(
      dataClientBundle.createWorkflowDataClient()
    );
    const stepExecutionRepository = new StepExecutionRepository(
      dataClientBundle.createStepDataClient()
    );
    const workflowRepository = new WorkflowRepository({ esClient, logger });
    const workflowTaskManager = new WorkflowTaskManager(taskManager as never);

    const schedulingDeps: SchedulingDeps = {
      coreStart: core as never,
      licensing: licensing as never,
      taskManager: taskManager as never,
      cloudSetup: undefined,
      config: { eventDriven },
      logger,
      workflowRepository,
      workflowExecutionRepository,
      stepExecutionRepository,
      workflowTaskManager,
      concurrencyManager: new ConcurrencyManager(workflowTaskManager, workflowExecutionRepository),
      // Resuming a parent workflow is the engine's job, on the node that claims the task.
      getInternalResumeWorkflowExecution: () => undefined,
    };
    const helpers = createSchedulingHelpers(schedulingDeps);
    const scheduleWorkflow = createScheduleWorkflow(schedulingDeps, helpers);
    const bulkScheduleWorkflow = createBulkScheduleWorkflow(schedulingDeps, helpers);

    const triggerEventHandler = new TriggerEventHandler({
      workflowExecutionRepository,
      coreStart: core as never,
      workflowRepository,
      workflowsExtensions: {
        getTriggerDefinition: workflowsExtensions.getTriggerDefinition,
      } as never,
      spaces: spaces.spacesService as never,
      scheduleWorkflow,
      logger,
      config: eventDriven,
      // Trigger events are logged to a data stream that only Kibana sets up.
      triggerEventsClientPromise: Promise.resolve(undefined),
    });

    const emitEvent: WorkflowsExecutionEngineTasksStart['emitEvent'] = async (
      request,
      triggerId,
      payload
    ) => {
      await triggerEventHandler.handleEvent({ triggerId, payload, request } as never);
    };

    workflowsExtensions.bindRuntime({
      isWorkflowsAvailable: async () => (await licensing.getLicense()).hasAtLeast('enterprise'),
      emitEvent,
    });

    return { emitEvent, bulkScheduleWorkflow };
  }
}

export const plugin = async (context: PluginInitializerContext<never>) =>
  new WorkflowsExecutionEngineTasksPlugin(context);
