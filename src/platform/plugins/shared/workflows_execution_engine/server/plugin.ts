/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as generateUuid } from 'uuid';
import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus, WorkflowRepository } from '@kbn/workflows';
import { WorkflowExecutionNotFoundError } from '@kbn/workflows/common/errors';

import type { WorkflowsExecutionEngineConfig } from './config';

import {
  checkAndSkipIfExistingScheduledExecution,
  resumeWorkflow,
  runWorkflow,
} from './execution_functions';
import { initializeLogsRepositoryDataStream } from './repositories/logs_repository/data_stream';
import { WorkflowExecutionRepository } from './repositories/workflow_execution_repository';
import type {
  CancelWorkflowExecution,
  ExecuteWorkflow,
  ExecuteWorkflowStep,
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
          if (!fakeRequest) {
            throw new Error('Cannot execute a workflow without Kibana Request');
          }
          const taskAbortController = new AbortController();
          return {
            run: async () => {
              const { workflowRunId, spaceId } =
                taskInstance.params as StartWorkflowExecutionParams;
              const [coreStart, pluginsStart] = await core.getStartServices();
              await this.initialize(coreStart);
              const dependencies: ContextDependencies = {
                ...setupDependencies,
                coreStart,
                actions: pluginsStart.actions,
                taskManager: pluginsStart.taskManager,
                workflowsExtensions: pluginsStart.workflowsExtensions,
              };

              await runWorkflow({
                workflowRunId,
                spaceId,
                taskAbortController,
                config,
                logger,
                fakeRequest,
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
          if (!fakeRequest) {
            throw new Error('Cannot resume a workflow without Kibana Request');
          }
          const taskAbortController = new AbortController();
          return {
            run: async () => {
              const { workflowRunId, spaceId } =
                taskInstance.params as ResumeWorkflowExecutionParams;
              const [coreStart, pluginsStart] = await core.getStartServices();
              await this.initialize(coreStart);
              const dependencies: ContextDependencies = {
                ...setupDependencies,
                coreStart,
                actions: pluginsStart.actions,
                taskManager: pluginsStart.taskManager,
                workflowsExtensions: pluginsStart.workflowsExtensions,
              };

              await resumeWorkflow({
                workflowRunId,
                spaceId,
                taskAbortController,
                config,
                logger,
                fakeRequest,
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
          if (!fakeRequest) {
            throw new Error('Cannot execute a scheduled workflow without Kibana Request');
          }
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
              const dependencies: ContextDependencies = {
                ...setupDependencies,
                coreStart,
                actions: pluginsStart.actions,
                taskManager: pluginsStart.taskManager,
                workflowsExtensions: pluginsStart.workflowsExtensions,
              };
              const esClient = coreStart.elasticsearch.client.asInternalUser;

              const workflowRepository = new WorkflowRepository({ esClient, logger });
              const workflowExecutionRepository = new WorkflowExecutionRepository(esClient);

              const workflow = await workflowRepository.getWorkflow(workflowId, spaceId);
              if (!workflow) {
                logger.error(`Workflow ${workflowId} not found`);
                return;
              }
              logger.info(`Running scheduled workflow task for workflow ${workflow.id}`);

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

              const workflowExecution = {
                id: generateUuid(),
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
                workflowRunId: workflowExecution.id,
                spaceId: workflowExecution.spaceId,
                taskAbortController,
                logger,
                config,
                fakeRequest,
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

    const dependencies: ContextDependencies = {
      ...this.setupDependencies,
      coreStart,
      actions: plugins.actions,
      taskManager: plugins.taskManager,
      workflowsExtensions: plugins.workflowsExtensions,
    };

    const executeWorkflow: ExecuteWorkflow = async (workflow, context, request) => {
      await this.initialize(coreStart);
      const workflowCreatedAt = new Date();
      // Get ES client and create repository for this execution
      const esClient = coreStart.elasticsearch.client.asInternalUser;
      const workflowExecutionRepository = new WorkflowExecutionRepository(esClient);

      const triggeredBy = context.triggeredBy || 'manual'; // 'manual' or 'scheduled'
      const workflowExecution = {
        id: generateUuid(),
        spaceId: context.spaceId,
        workflowId: workflow.id,
        isTestRun: workflow.isTestRun,
        workflowDefinition: workflow.definition,
        yaml: workflow.yaml,
        context,
        status: ExecutionStatus.PENDING,
        createdAt: workflowCreatedAt.toISOString(),
        createdBy: context.createdBy || '', // TODO: set if available
        triggeredBy, // <-- new field for scheduled workflows
      };
      await workflowExecutionRepository.createWorkflowExecution(workflowExecution);

      // AUTO-DETECT: Check if we're already running in a Task Manager context
      const isRunningInTaskManager =
        triggeredBy === 'scheduled' ||
        context.source === 'task-manager' ||
        request.isFakeRequest === true;

      if (isRunningInTaskManager) {
        // We're already in a task - execute directly without scheduling another task
        this.logger.debug(
          `Executing workflow directly (already in Task Manager context): ${workflow.id}`
        );

        await runWorkflow({
          workflowRunId: workflowExecution.id,
          spaceId: workflowExecution.spaceId,
          taskAbortController: new AbortController(),
          logger: this.logger,
          config: this.config,
          fakeRequest: request,
          dependencies,
        });
      } else {
        const taskInstance = {
          id: `workflow:${workflowExecution.id}:${context.triggeredBy}`,
          taskType: 'workflow:run',
          params: {
            workflowRunId: workflowExecution.id,
            spaceId: workflowExecution.spaceId,
          },
          state: {
            lastRunAt: null,
            lastRunStatus: null,
            lastRunError: null,
          },
          scope: ['workflows'],
          enabled: true,
        };

        // Use Task Manager's first-class API key support by passing the request
        // Task Manager will automatically create and manage the API key
        if (request) {
          // Debug: Log the user info from the original request
          this.logger.debug(
            `Scheduling workflow task with user context for workflow ${workflow.id}`
          );
          await plugins.taskManager.schedule(taskInstance, { request });
        } else {
          this.logger.debug(
            `Workflow with execution id ${workflowExecution.id} does not have a request, aborting`
          );
          await workflowExecutionRepository.updateWorkflowExecution({
            id: workflowExecution.id,
            status: ExecutionStatus.FAILED,
            error: {
              type: 'Error',
              message: 'Workflows cannot be executed without the user context',
            },
          });
        }
      }

      return {
        workflowExecutionId: workflowExecution.id,
      };
    };

    const executeWorkflowStep: ExecuteWorkflowStep = async (workflow, stepId, context, request) => {
      await this.initialize(coreStart);
      const workflowCreatedAt = new Date();

      // Get ES client and create repository for this execution
      const esClient = coreStart.elasticsearch.client.asInternalUser;
      const workflowExecutionRepository = new WorkflowExecutionRepository(esClient);

      const triggeredBy = context.triggeredBy || 'manual'; // 'manual' or 'scheduled'
      const workflowExecution = {
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
        createdBy: context.createdBy || '', // TODO: set if available
        triggeredBy, // <-- new field for scheduled workflows
      };

      await workflowExecutionRepository.createWorkflowExecution(workflowExecution);

      const taskInstance = {
        id: `workflow:${workflowExecution.id}:${workflowExecution.triggeredBy}`,
        taskType: 'workflow:run',
        params: {
          workflowRunId: workflowExecution.id,
          spaceId: workflowExecution.spaceId,
        },
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
      if (request) {
        this.logger.debug(
          `Scheduling workflow step task with user context for workflow ${workflow.id}, step ${stepId}`
        );
        await plugins.taskManager.schedule(taskInstance, { request });
      } else {
        this.logger.debug(
          `Workflow with execution id ${workflowExecution.id} does not have a request, aborting`
        );
        await workflowExecutionRepository.updateWorkflowExecution({
          id: workflowExecution.id,
          status: ExecutionStatus.FAILED,
          error: {
            type: 'Error',
            message: 'Workflows cannot be executed without the user context',
          },
        });
      }

      return {
        workflowExecutionId: workflowExecution.id,
      };
    };

    const cancelWorkflowExecution: CancelWorkflowExecution = async (
      workflowExecutionId,
      spaceId
    ) => {
      await this.initialize(coreStart);
      const esClient = coreStart.elasticsearch.client.asInternalUser;
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

    const workflowEventLoggerService = new WorkflowEventLoggerService(
      coreStart.dataStreams,
      this.logger,
      this.config.logging.console
    );

    return {
      workflowEventLoggerService,
      executeWorkflow,
      executeWorkflowStep,
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
