/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: Remove eslint exceptions comments and fix the issues
// /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import type { Client } from '@elastic/elasticsearch';
import { v4 as generateUuid } from 'uuid';
import type {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { EsWorkflowExecution, WorkflowExecutionEngineModel } from '@kbn/workflows';
import { ExecutionStatus, WorkflowRepository } from '@kbn/workflows';
import { WorkflowExecutionNotFoundError } from '@kbn/workflows/common/errors';

import type { WorkflowsExecutionEngineConfig } from './config';

import {
  checkAndSkipIfExistingScheduledExecution,
  resumeWorkflow,
  runWorkflow,
} from './execution_functions';
import { LogsRepository } from './repositories/logs_repository';
import { initializeLogsRepositoryDataStream } from './repositories/logs_repository/data_stream';
import { StepExecutionRepository } from './repositories/step_execution_repository';
import { WorkflowExecutionRepository } from './repositories/workflow_execution_repository';
import type {
  ExecuteWorkflowStepResponse,
  WorkflowsExecutionEnginePluginSetup,
  WorkflowsExecutionEnginePluginSetupDeps,
  WorkflowsExecutionEnginePluginStart,
  WorkflowsExecutionEnginePluginStartDeps,
} from './types';

import { generateExecutionTaskScope } from './utils';
import type { ContextDependencies } from './workflow_context_manager/types';
import { WorkflowEventLoggerService } from './workflow_event_logger';
import type {
  ResumeWorkflowExecutionParams,
  StartWorkflowExecutionParams,
} from './workflow_task_manager/types';

import { WorkflowTaskManager } from './workflow_task_manager/workflow_task_manager';
import { createIndexes } from '../common';

type SetupDependencies = Pick<ContextDependencies, 'cloudSetup'>;

export class WorkflowsExecutionEnginePlugin
  implements
    Plugin<
      WorkflowsExecutionEnginePluginSetup,
      WorkflowsExecutionEnginePluginStart,
      WorkflowsExecutionEnginePluginSetupDeps,
      WorkflowsExecutionEnginePluginStartDeps
    >
{
  private readonly logger: Logger;
  private readonly config: WorkflowsExecutionEngineConfig;
  private setupDependencies?: SetupDependencies;
  private initializePromise?: Promise<void>;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<WorkflowsExecutionEngineConfig>();
  }

  public setup(
    core: CoreSetup<WorkflowsExecutionEnginePluginStartDeps, WorkflowsExecutionEnginePluginStart>,
    plugins: WorkflowsExecutionEnginePluginSetupDeps
  ) {
    this.logger.debug('workflows-execution-engine: Setup');

    const logger = this.logger;
    const config = this.config;

    initializeLogsRepositoryDataStream(core.dataStreams);

    const setupDependencies: SetupDependencies = { cloudSetup: plugins.cloud };
    this.setupDependencies = setupDependencies;

    plugins.taskManager.registerTaskDefinitions({
      'workflow:run': {
        title: 'Run Workflow',
        description: 'Executes a workflow immediately',
        // Set high timeout for long-running workflows.
        // This is high value to allow long-running workflows.
        // The workflow timeout logic defined in workflow execution engine logic is the primary control.
        timeout: '365d',
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance, fakeRequest }) => {
          const taskAbortController = new AbortController();
          return {
            run: async () => {
              const { workflowRunId, spaceId } =
                taskInstance.params as StartWorkflowExecutionParams;
              const [coreStart, pluginsStart] = await core.getStartServices();
              await this.initialize(coreStart);
              const { elasticsearch } = coreStart;
              const { actions, taskManager } = pluginsStart;
              const dependencies: ContextDependencies = setupDependencies; // TODO: append start dependencies

              // Get ES client from core services (guaranteed to be available at task execution time)
              const esClient = elasticsearch.client.asInternalUser as Client;
              const workflowExecutionRepository = new WorkflowExecutionRepository(esClient);
              const stepExecutionRepository = new StepExecutionRepository(esClient);

              await runWorkflow({
                workflowRunId,
                spaceId,
                workflowExecutionRepository, // TODO: remove from params, can be created inside
                stepExecutionRepository, // TODO: remove from params, can be created inside
                taskAbortController,
                taskManager, // TODO: move to dependencies
                actions, // TODO: move to dependencies
                coreStart, // TODO: move to dependencies
                config,
                logger,
                fakeRequest: fakeRequest || ({} as KibanaRequest),
                dependencies,
              });
            },
            cancel: async () => {
              taskAbortController.abort();
            },
          };
        },
      },
    });
    plugins.taskManager.registerTaskDefinitions({
      'workflow:resume': {
        title: 'Resume Workflow',
        description: 'Resumes a paused workflow',
        // Set high timeout for long-running workflows.
        // This is high value to allow long-running workflows.
        // The workflow timeout logic defined in workflow execution engine logic is the primary control.
        timeout: '365d',
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance, fakeRequest }) => {
          const taskAbortController = new AbortController();
          return {
            run: async () => {
              const { workflowRunId, spaceId } =
                taskInstance.params as ResumeWorkflowExecutionParams;
              const [coreStart, pluginsStart] = await core.getStartServices();
              await this.initialize(coreStart);
              const dependencies: ContextDependencies = setupDependencies; // TODO: append start dependencies
              const { actions, taskManager } = pluginsStart;
              const { dataStreams, elasticsearch } = coreStart;
              // Get ES client from core services (guaranteed to be available at task execution time)
              const unscopedEsClient = elasticsearch.client.asInternalUser as Client;
              const workflowExecutionRepository = new WorkflowExecutionRepository(unscopedEsClient);
              const stepExecutionRepository = new StepExecutionRepository(unscopedEsClient);
              const logsRepository = new LogsRepository(dataStreams);

              await resumeWorkflow({
                workflowRunId,
                spaceId,
                workflowExecutionRepository,
                stepExecutionRepository,
                logsRepository,
                taskAbortController,
                taskManager,
                actions,
                coreStart,
                config,
                logger,
                fakeRequest: fakeRequest || ({} as KibanaRequest),
                dependencies,
              });
            },
            cancel: async () => {
              taskAbortController.abort();
            },
          };
        },
      },
    });
    plugins.taskManager.registerTaskDefinitions({
      'workflow:scheduled': {
        title: 'Scheduled Workflow Execution',
        description: 'Executes workflows on a scheduled basis',
        // Set high timeout for long-running workflows.
        // This is high value to allow long-running workflows.
        // The workflow timeout logic defined in workflow execution engine logic is the primary control.
        timeout: '365d',
        maxAttempts: 3,
        createTaskRunner: ({ taskInstance, fakeRequest }) => {
          const taskAbortController = new AbortController();
          return {
            run: async () => {
              const { workflowId, spaceId } = taskInstance.params as {
                workflowId: string;
                spaceId: string;
                triggerType: string;
              };
              const [coreStart, pluginsStart] = await core.getStartServices();
              await this.initialize(coreStart);
              const dependencies: ContextDependencies = setupDependencies; // TODO: append start dependencies
              const { actions, taskManager } = pluginsStart;
              const workflowRepository = new WorkflowRepository({
                esClient: coreStart.elasticsearch.client.asInternalUser as Client,
                logger,
              });

              const workflow = await workflowRepository.getWorkflow(workflowId, spaceId);
              if (!workflow) {
                logger.error(`Workflow ${workflowId} not found`);
                return;
              }
              logger.info(`Running scheduled workflow task for workflow ${workflow.id}`);

              const { dataStreams, elasticsearch } = coreStart;
              const esClient = elasticsearch.client.asInternalUser as Client;
              const workflowExecutionRepository = new WorkflowExecutionRepository(esClient);

              // Guard check: Check if there's already a scheduled workflow execution in non-terminal state
              const wasSkipped = await checkAndSkipIfExistingScheduledExecution(
                workflow,
                spaceId,
                workflowExecutionRepository,
                logger
              );
              if (wasSkipped) {
                return;
              }

              // Check for RRule triggers and log details
              const scheduledTriggers =
                workflow.definition?.triggers?.filter((trigger) => trigger.type === 'scheduled') ||
                [];
              const rruleTriggers = scheduledTriggers.filter(
                (trigger) => trigger.type === 'scheduled' && 'rrule' in (trigger.with || {})
              );

              // Create workflow execution record
              const workflowCreatedAt = new Date();
              const stepExecutionRepository = new StepExecutionRepository(esClient);
              const logsRepository = new LogsRepository(dataStreams);

              const executionContext = {
                workflowRunId: `scheduled-${Date.now()}`,
                spaceId,
                inputs: {},
                event: {
                  type: 'scheduled',
                  timestamp: new Date().toISOString(),
                  source: 'task-manager',
                },
                triggeredBy: 'scheduled',
              };

              const workflowExecutionId = generateUuid();
              const workflowExecution: Partial<EsWorkflowExecution> = {
                id: workflowExecutionId,
                spaceId,
                workflowId: workflow.id,
                isTestRun: false,
                workflowDefinition: workflow.definition,
                yaml: workflow.yaml,
                context: executionContext,
                status: ExecutionStatus.PENDING,
                createdAt: workflowCreatedAt.toISOString(),
                createdBy: '',
                triggeredBy: 'scheduled',
              };
              await workflowExecutionRepository.createWorkflowExecution(workflowExecution);

              await runWorkflow({
                workflowRunId: workflowExecutionId,
                spaceId,
                workflowExecutionRepository,
                stepExecutionRepository,
                logsRepository,
                taskAbortController,
                coreStart,
                actions,
                taskManager,
                logger,
                config,
                fakeRequest: fakeRequest || ({} as KibanaRequest),
                dependencies,
              });

              const scheduleType = rruleTriggers.length > 0 ? 'RRule' : 'interval/cron';
              logger.debug(
                `Successfully executed ${scheduleType}-scheduled workflow ${workflow.id}`
              );
            },
            async cancel() {
              taskAbortController.abort();
            },
          };
        },
      },
    });

    return {};
  }

  public start(coreStart: CoreStart, plugins: WorkflowsExecutionEnginePluginStartDeps) {
    this.logger.debug('workflows-execution-engine: Start');

    if (!this.setupDependencies) {
      throw new Error('Setup not called before start');
    }
    const dependencies: ContextDependencies = this.setupDependencies;
    const logsRepository = new LogsRepository(coreStart.dataStreams);

    // Helper function to create and persist a workflow execution
    const createAndPersistWorkflowExecution = async (
      workflow: WorkflowExecutionEngineModel,
      context: Record<string, unknown>,
      defaultTriggeredBy: string
    ): Promise<{
      workflowExecution: Partial<EsWorkflowExecution>;
      repository: WorkflowExecutionRepository;
    }> => {
      await this.initialize(coreStart);
      const workflowCreatedAt = new Date();
      // Get ES client and create repository for this execution
      const esClient = coreStart.elasticsearch.client.asInternalUser as Client;
      const workflowExecutionRepository = new WorkflowExecutionRepository(esClient);

      const triggeredBy = (context.triggeredBy as string | undefined) || defaultTriggeredBy;
      const workflowExecution: Partial<EsWorkflowExecution> = {
        id: generateUuid(),
        spaceId: context.spaceId as string | undefined,
        workflowId: workflow.id,
        isTestRun: workflow.isTestRun,
        workflowDefinition: workflow.definition,
        yaml: workflow.yaml,
        context,
        status: ExecutionStatus.PENDING,
        createdAt: workflowCreatedAt.toISOString(),
        createdBy: (context.createdBy as string | undefined) || '',
        triggeredBy,
      };
      await workflowExecutionRepository.createWorkflowExecution(workflowExecution);

      return { workflowExecution, repository: workflowExecutionRepository };
    };

    // Helper function to create a task instance
    const createTaskInstance = (
      workflowExecution: Partial<EsWorkflowExecution>,
      scope: string[]
    ) => {
      return {
        id: `workflow:${workflowExecution.id}:${workflowExecution.triggeredBy}`,
        taskType: 'workflow:run',
        params: {
          workflowRunId: workflowExecution.id,
          spaceId: workflowExecution.spaceId,
        } as StartWorkflowExecutionParams,
        state: {
          lastRunAt: null,
          lastRunStatus: null,
          lastRunError: null,
        },
        scope,
        enabled: true,
      };
    };

    const executeWorkflow = async (
      workflow: WorkflowExecutionEngineModel,
      context: Record<string, unknown>,
      request?: KibanaRequest | undefined
    ) => {
      // AUTO-DETECT: Check if we're already running in a Task Manager context
      // We can determine this from context and request before creating the execution
      const isRunningInTaskManager =
        (context.triggeredBy as string | undefined) === 'scheduled' ||
        (context.source as string | undefined) === 'task-manager' ||
        request?.isFakeRequest === true;

      if (!isRunningInTaskManager && !request) {
        throw new Error('Workflows cannot be executed without the user context');
      }

      const { workflowExecution, repository: workflowExecutionRepository } =
        await createAndPersistWorkflowExecution(workflow, context, 'manual');

      const esClient = coreStart.elasticsearch.client.asInternalUser as Client;
      const stepExecutionRepository = new StepExecutionRepository(esClient);

      if (isRunningInTaskManager) {
        // We're already in a task - execute directly without scheduling another task
        this.logger.debug(
          `Executing workflow directly (already in Task Manager context): ${workflow.id}`
        );

        await runWorkflow({
          workflowRunId: workflowExecution.id || '',
          spaceId: workflowExecution.spaceId || 'default',
          workflowExecutionRepository,
          stepExecutionRepository,
          logsRepository,
          taskAbortController: new AbortController(), // TODO: We need to think how to pass this properly from outer task
          coreStart,
          actions: plugins.actions,
          taskManager: plugins.taskManager,
          logger: this.logger,
          config: this.config,
          fakeRequest: request || ({} as KibanaRequest), // In TaskManager context, request may be undefined
          dependencies,
        });
      } else {
        const taskInstance = createTaskInstance(workflowExecution, ['workflows']);
        await plugins.taskManager.schedule(taskInstance, { request: request as KibanaRequest });
        this.logger.debug(
          `Scheduling workflow task with user context for workflow ${workflow.id}, execution ${workflowExecution.id}`
        );
      }

      return {
        workflowExecutionId: workflowExecution.id || '',
      };
    };

    const scheduleWorkflow = async (
      workflow: WorkflowExecutionEngineModel,
      context: Record<string, unknown>,
      request: KibanaRequest
    ) => {
      const { workflowExecution } = await createAndPersistWorkflowExecution(
        workflow,
        context,
        'alert'
      );

      // Always schedule a task (never execute directly)
      const taskInstance = createTaskInstance(
        workflowExecution,
        generateExecutionTaskScope(workflowExecution as EsWorkflowExecution)
      );

      await plugins.taskManager.schedule(taskInstance, { request });
      this.logger.debug(
        `Scheduling workflow task with user context for workflow ${workflow.id}, execution ${workflowExecution.id}`
      );

      return {
        workflowExecutionId: workflowExecution.id || '',
      };
    };

    const executeWorkflowStep = async (
      workflow: WorkflowExecutionEngineModel,
      stepId: string,
      contextOverride: Record<string, unknown>,
      request?: KibanaRequest | undefined
    ): Promise<ExecuteWorkflowStepResponse> => {
      // Check if request is required before creating execution
      // Workflow steps require user context to run with proper permissions
      if (!request) {
        throw new Error('Workflow steps cannot be executed without the user context');
      }

      await this.initialize(coreStart);
      const workflowCreatedAt = new Date();

      // Get ES client and create repository for this execution
      const esClient = coreStart.elasticsearch.client.asInternalUser as Client;
      const workflowExecutionRepository = new WorkflowExecutionRepository(esClient);
      const context: Record<string, unknown> = {
        contextOverride,
      };

      const triggeredBy = (context.triggeredBy as string | undefined) || 'manual'; // 'manual' or 'scheduled'
      const workflowExecution: Partial<EsWorkflowExecution> = {
        id: generateUuid(),
        spaceId: workflow.spaceId,
        stepId,
        workflowId: workflow.id,
        isTestRun: workflow.isTestRun,
        workflowDefinition: workflow.definition,
        yaml: workflow.yaml,
        context,
        status: ExecutionStatus.PENDING,
        createdAt: workflowCreatedAt.toISOString(),
        createdBy: (context.createdBy as string | undefined) || '', // TODO: set if available
        triggeredBy, // <-- new field for scheduled workflows
      };
      await workflowExecutionRepository.createWorkflowExecution(workflowExecution);
      const taskInstance = {
        id: `workflow:${workflowExecution.id}:${workflowExecution.triggeredBy}`,
        taskType: 'workflow:run',
        params: {
          workflowRunId: workflowExecution.id,
          spaceId: workflowExecution.spaceId,
        } as StartWorkflowExecutionParams,
        state: {
          lastRunAt: null,
          lastRunStatus: null,
          lastRunError: null,
        },
        scope: generateExecutionTaskScope(workflowExecution as EsWorkflowExecution),
        enabled: true,
      };

      // Use Task Manager's first-class API key support by passing the request
      // This ensures the step runs with the user's permissions, not kibana_system
      // At this point, request is guaranteed to exist due to the early check above
      this.logger.debug(
        `Scheduling workflow step task with user context for workflow ${workflow.id}, step ${stepId}`
      );
      await plugins.taskManager.schedule(taskInstance, { request });

      return {
        workflowExecutionId: workflowExecution.id || '',
      };
    };

    const cancelWorkflowExecution = async (workflowExecutionId: string, spaceId: string) => {
      await this.initialize(coreStart);
      const esClient = coreStart.elasticsearch.client.asInternalUser as Client;
      const workflowExecutionRepository = new WorkflowExecutionRepository(esClient);
      const workflowExecution = await workflowExecutionRepository.getWorkflowExecutionById(
        workflowExecutionId,
        spaceId
      );
      const workflowTaskManager = new WorkflowTaskManager(plugins.taskManager);

      if (!workflowExecution) {
        throw new WorkflowExecutionNotFoundError(workflowExecutionId);
      }

      if (
        [ExecutionStatus.CANCELLED, ExecutionStatus.COMPLETED, ExecutionStatus.FAILED].includes(
          workflowExecution.status
        )
      ) {
        // Already in a terminal state or being canceled
        return;
      }

      await workflowExecutionRepository.updateWorkflowExecution({
        id: workflowExecution.id,
        cancelRequested: true,
        cancellationReason: 'Cancelled by user',
        cancelledAt: new Date().toISOString(),
        cancelledBy: 'system', // TODO: set user if available
      });
      await workflowTaskManager.forceRunIdleTasks(workflowExecution.id);
    };

    return {
      workflowEventLoggerService: new WorkflowEventLoggerService(
        logsRepository,
        this.logger,
        this.config.logging.console
      ),
      executeWorkflow,
      executeWorkflowStep,
      scheduleWorkflow,
      cancelWorkflowExecution,
    };
  }

  public stop() {}

  private async initialize(coreStart: CoreStart): Promise<void> {
    if (!this.initializePromise) {
      this.initializePromise = createIndexes({
        esClient: coreStart.elasticsearch.client.asInternalUser,
        logger: this.logger,
      });
    }
    await this.initializePromise;
  }
}
