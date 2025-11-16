/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: Remove eslint exceptions comments and fix the issues
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import type { Client } from '@elastic/elasticsearch';
import { v4 as generateUuid } from 'uuid';
import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { EsWorkflowExecution, WorkflowExecutionEngineModel } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowExecutionNotFoundError } from '@kbn/workflows/common/errors';

import type { WorkflowsExecutionEngineConfig } from './config';

import { resumeWorkflow, runWorkflow } from './execution_functions';
import { LogsRepository } from './repositories/logs_repository';
import { StepExecutionRepository } from './repositories/step_execution_repository';
import { WorkflowExecutionRepository } from './repositories/workflow_execution_repository';
import type {
  ExecuteWorkflowStepResponse,
  WorkflowsExecutionEnginePluginSetup,
  WorkflowsExecutionEnginePluginSetupDeps,
  WorkflowsExecutionEnginePluginStart,
  WorkflowsExecutionEnginePluginStartDeps,
} from './types';

import type { ContextDependencies } from './workflow_context_manager/types';
import type {
  ResumeWorkflowExecutionParams,
  StartWorkflowExecutionParams,
} from './workflow_task_manager/types';
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
              const { actions, taskManager } = pluginsStart;
              const dependencies: ContextDependencies = setupDependencies; // TODO: append start dependencies

              // Get ES client from core services (guaranteed to be available at task execution time)
              const esClient = coreStart.elasticsearch.client.asInternalUser as Client;
              const workflowExecutionRepository = new WorkflowExecutionRepository(esClient);
              const stepExecutionRepository = new StepExecutionRepository(esClient);
              await runWorkflow({
                workflowRunId,
                spaceId,
                workflowExecutionRepository, // TODO: remove from params, can be created inside
                stepExecutionRepository, // TODO: remove from params, can be created inside
                taskAbortController,
                taskManager, // TODO: move to dependencies
                esClient, // TODO: remove from params, can be created inside
                actions, // TODO: move to dependencies
                coreStart, // TODO: move to dependencies
                config,
                logger,
                fakeRequest: fakeRequest!,
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
              // Get ES client from core services (guaranteed to be available at task execution time)
              const esClient = coreStart.elasticsearch.client.asInternalUser as Client;
              const workflowExecutionRepository = new WorkflowExecutionRepository(esClient);
              const stepExecutionRepository = new StepExecutionRepository(esClient);
              const logsRepository = new LogsRepository(esClient);

              await resumeWorkflow({
                workflowRunId,
                spaceId,
                workflowExecutionRepository,
                stepExecutionRepository,
                logsRepository,
                taskAbortController,
                taskManager,
                esClient,
                actions,
                coreStart,
                config,
                logger,
                fakeRequest: fakeRequest!,
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

    return {};
  }

  public start(coreStart: CoreStart, plugins: WorkflowsExecutionEnginePluginStartDeps) {
    this.logger.debug('workflows-execution-engine: Start');
    if (!this.setupDependencies) {
      throw new Error('Setup not called before start');
    }
    const dependencies: ContextDependencies = this.setupDependencies; // TODO: append start dependencies

    const executeWorkflow = async (
      workflow: WorkflowExecutionEngineModel,
      context: Record<string, any>,
      request?: any
    ) => {
      await this.initialize(coreStart);
      const workflowCreatedAt = new Date();

      // Get ES client and create repository for this execution
      const esClient = coreStart.elasticsearch.client.asInternalUser as Client;
      const workflowExecutionRepository = new WorkflowExecutionRepository(esClient);
      const stepExecutionRepository = new StepExecutionRepository(esClient);
      const logsRepository = new LogsRepository(esClient);

      const triggeredBy = context.triggeredBy || 'manual'; // 'manual' or 'scheduled'
      const workflowExecution: Partial<EsWorkflowExecution> = {
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
        request?.isFakeRequest === true;

      if (isRunningInTaskManager) {
        // We're already in a task - execute directly without scheduling another task
        this.logger.debug(
          `Executing workflow directly (already in Task Manager context): ${workflow.id}`
        );

        await runWorkflow({
          workflowRunId: workflowExecution.id!,
          spaceId: workflowExecution.spaceId!,
          workflowExecutionRepository,
          stepExecutionRepository,
          logsRepository,
          taskAbortController: new AbortController(), // TODO: We need to think how to pass this properly from outer task
          coreStart,
          esClient,
          actions: plugins.actions,
          taskManager: plugins.taskManager,
          logger: this.logger,
          config: this.config,
          fakeRequest: request, // will be undefined if not available
          dependencies,
        });
      } else {
        // Normal manual execution - schedule a task
        const taskInstance = {
          id: `workflow:${workflowExecution.id}:${context.triggeredBy}`,
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
          this.logger.debug(`Scheduling workflow task without user context`);
          await plugins.taskManager.schedule(taskInstance);
        }
      }
      return {
        workflowExecutionId: workflowExecution.id!,
      };
    };

    const executeWorkflowStep = async (
      workflow: WorkflowExecutionEngineModel,
      stepId: string,
      contextOverride: Record<string, any>
    ): Promise<ExecuteWorkflowStepResponse> => {
      await this.initialize(coreStart);
      const workflowCreatedAt = new Date();

      // Get ES client and create repository for this execution
      const esClient = coreStart.elasticsearch.client.asInternalUser as Client;
      const workflowExecutionRepository = new WorkflowExecutionRepository(esClient);
      const context: Record<string, any> = {
        contextOverride,
      };

      const triggeredBy = context.triggeredBy || 'manual'; // 'manual' or 'scheduled'
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
        createdBy: context.createdBy || '', // TODO: set if available
        triggeredBy, // <-- new field for scheduled workflows
      };
      await workflowExecutionRepository.createWorkflowExecution(workflowExecution);
      const taskInstance = {
        id: `workflow:${workflowExecution.id}:${context.triggeredBy}`,
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
        scope: ['workflows'],
        enabled: true,
      };

      await plugins.taskManager.schedule(taskInstance);
      return {
        workflowExecutionId: workflowExecution.id!,
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

      // Request cancellation
      await workflowExecutionRepository.updateWorkflowExecution({
        id: workflowExecution.id,
        cancelRequested: true,
        cancellationReason: 'Cancelled by user',
        cancelledAt: new Date().toISOString(),
        cancelledBy: 'system', // TODO: set user if available
      });

      if (
        [ExecutionStatus.WAITING, ExecutionStatus.WAITING_FOR_INPUT].includes(
          workflowExecution.status
        )
      ) {
        // TODO: handle WAITING states
        // It should clean up resume tasks, etc
      }
    };

    return {
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
