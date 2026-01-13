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
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type {
  ConcurrencySettings,
  EsWorkflowExecution,
  WorkflowExecutionEngineModel,
} from '@kbn/workflows';
import { ExecutionStatus, WorkflowRepository } from '@kbn/workflows';
import { WorkflowExecutionNotFoundError } from '@kbn/workflows/common/errors';
import { ConcurrencyManager } from './concurrency/concurrency_manager';
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
  ScheduleWorkflow,
  WorkflowsExecutionEnginePluginSetup,
  WorkflowsExecutionEnginePluginSetupDeps,
  WorkflowsExecutionEnginePluginStart,
  WorkflowsExecutionEnginePluginStartDeps,
} from './types';
import { generateExecutionTaskScope } from './utils';
import { buildWorkflowContext } from './workflow_context_manager/build_workflow_context';
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
  private concurrencyManager!: ConcurrencyManager;
  private setupDependencies?: SetupDependencies;
  private coreSetup?: CoreSetup<
    WorkflowsExecutionEnginePluginStartDeps,
    WorkflowsExecutionEnginePluginStart
  >;
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

    this.coreSetup = core;

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
              const [coreStart, pluginsStart, workflowsExecutionEngine] =
                await core.getStartServices();
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
                workflowsExecutionEngine,
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
              const [coreStart, pluginsStart, workflowsExecutionEngine] =
                await core.getStartServices();
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
                workflowsExecutionEngine,
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
              logger.debug(`Running scheduled workflow task for workflow ${workflow.id}`);

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

              const workflowExecution: Partial<EsWorkflowExecution> = {
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

              const concurrencyGroupKey = this.getConcurrencyGroupKey(
                workflowExecution,
                workflow.definition?.settings?.concurrency,
                coreStart,
                dependencies
              );
              if (concurrencyGroupKey) {
                workflowExecution.concurrencyGroupKey = concurrencyGroupKey;
              }

              await workflowExecutionRepository.createWorkflowExecution(workflowExecution);

              // Check concurrency limits and apply collision strategy if needed
              const canProceed = await this.checkConcurrencyIfNeeded(workflowExecution);
              if (!canProceed) {
                // Execution was dropped due to concurrency limit, skip running
                return;
              }

              if (!workflowExecution.id || !workflowExecution.spaceId) {
                throw new Error('Workflow execution must have id and spaceId');
              }

              const [, , workflowsExecutionEngine] = await core.getStartServices();

              await runWorkflow({
                workflowRunId: workflowExecution.id,
                spaceId: workflowExecution.spaceId,
                taskAbortController,
                logger,
                config,
                fakeRequest,
                dependencies,
                workflowsExecutionEngine,
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

    // Initialize ConcurrencyManager with dependencies
    const workflowTaskManager = new WorkflowTaskManager(plugins.taskManager);
    const workflowExecutionRepository = new WorkflowExecutionRepository(
      coreStart.elasticsearch.client.asInternalUser
    );
    this.concurrencyManager = new ConcurrencyManager(
      workflowTaskManager,
      workflowExecutionRepository
    );

    const dependencies: ContextDependencies = {
      ...this.setupDependencies,
      coreStart,
      actions: plugins.actions,
      taskManager: plugins.taskManager,
      workflowsExtensions: plugins.workflowsExtensions,
    };

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
      const triggeredBy = (context.triggeredBy as string | undefined) || defaultTriggeredBy;
      const createdBy = (context.createdBy as string | undefined) || 'system';
      const spaceId = (context.spaceId as string | undefined) || 'default';
      const workflowExecution: Partial<EsWorkflowExecution> = {
        id: generateUuid(),
        spaceId,
        workflowId: workflow.id,
        isTestRun: workflow.isTestRun,
        workflowDefinition: workflow.definition,
        yaml: workflow.yaml,
        context,
        status: ExecutionStatus.PENDING,
        createdAt: workflowCreatedAt.toISOString(),
        createdBy,
        triggeredBy,
      };

      const concurrencyGroupKey = this.getConcurrencyGroupKey(
        workflowExecution,
        workflow.definition?.settings?.concurrency,
        coreStart,
        dependencies
      );
      if (concurrencyGroupKey) {
        workflowExecution.concurrencyGroupKey = concurrencyGroupKey;
      }

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

    const executeWorkflow: ExecuteWorkflow = async (workflow, context, request) => {
      // AUTO-DETECT: Check if we're already running in a Task Manager context
      // We can determine this from context and request before creating the execution
      const isRunningInTaskManager =
        (context.triggeredBy as string | undefined) === 'scheduled' ||
        (context.source as string | undefined) === 'task-manager' ||
        request?.isFakeRequest === true;

      if (!isRunningInTaskManager && !request) {
        throw new Error('Workflows cannot be executed without the user context');
      }

      const { workflowExecution } = await createAndPersistWorkflowExecution(
        workflow,
        context,
        'manual'
      );

      // Check concurrency limits and apply collision strategy if needed
      const canProceed = await this.checkConcurrencyIfNeeded(workflowExecution);
      if (!canProceed) {
        // Execution was dropped due to concurrency limit, return execution ID
        return {
          workflowExecutionId: workflowExecution.id as string,
        };
      }

      if (isRunningInTaskManager) {
        // We're already in a task - execute directly without scheduling another task
        this.logger.debug(
          `Executing workflow directly (already in Task Manager context): ${workflow.id}`
        );

        // Get workflowsExecutionEngine from getStartServices (third element is this plugin's start contract)
        if (!this.coreSetup) {
          throw new Error('Core setup not available');
        }
        const [, , workflowsExecutionEngine] = await this.coreSetup.getStartServices();

        await runWorkflow({
          workflowRunId: workflowExecution.id as string,
          spaceId: workflowExecution.spaceId || 'default',
          taskAbortController: new AbortController(), // TODO: We need to think how to pass this properly from outer task
          logger: this.logger,
          config: this.config,
          fakeRequest: request,
          dependencies,
          workflowsExecutionEngine,
        });
      } else {
        const taskInstance = createTaskInstance(workflowExecution, ['workflows']);
        await plugins.taskManager.schedule(taskInstance, { request: request as KibanaRequest });
        this.logger.debug(
          `Scheduling workflow task with user context for workflow ${workflow.id}, execution ${workflowExecution.id}`
        );
      }

      return {
        workflowExecutionId: workflowExecution.id as string,
      };
    };

    const scheduleWorkflow: ScheduleWorkflow = async (workflow, context, request) => {
      const { workflowExecution } = await createAndPersistWorkflowExecution(
        workflow,
        context,
        'alert'
      );

      // Check concurrency limits and apply collision strategy if needed
      const canProceed = await this.checkConcurrencyIfNeeded(workflowExecution);
      if (!canProceed) {
        // Execution was dropped due to concurrency limit, skip scheduling
        return {
          workflowExecutionId: workflowExecution.id as string,
        };
      }

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
        workflowExecutionId: workflowExecution.id as string,
      };
    };

    const executeWorkflowStep: ExecuteWorkflowStep = async (
      workflow,
      stepId,
      contextOverride,
      request
    ) => {
      // Check if request is required before creating execution
      // Workflow steps require user context to run with proper permissions
      if (!request) {
        throw new Error('Workflow steps cannot be executed without the user context');
      }
      await this.initialize(coreStart);
      const workflowCreatedAt = new Date();
      const context: Record<string, unknown> = {
        contextOverride,
      };

      const triggeredBy = (context.triggeredBy as string | undefined) || 'manual'; // 'manual' or 'scheduled'
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
        createdBy: context.createdBy as string | undefined, // TODO: set if available
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
      // At this point, request is guaranteed to exist due to the early check above
      this.logger.debug(
        `Scheduling workflow step task with user context for workflow ${workflow.id}, step ${stepId}`
      );
      await plugins.taskManager.schedule(taskInstance, { request });

      return {
        workflowExecutionId: workflowExecution.id as string,
      };
    };

    const cancelWorkflowExecution: CancelWorkflowExecution = async (
      workflowExecutionId,
      spaceId
    ) => {
      await this.initialize(coreStart);
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

  /**
   * Reused local wrapper for evaluating the concurrency group key for a workflow execution.
   * Normalizes the partial workflowExecution to build the workflow context needed for template evaluation.
   *
   * @param workflowExecution - The partial workflow execution
   * @param concurrencySettings - The concurrency settings from workflow definition
   * @param coreStart - Core start services
   * @param dependencies - Context dependencies for building workflow context
   * @returns The evaluated concurrency group key, or null if not applicable
   */
  private getConcurrencyGroupKey(
    workflowExecution: Partial<EsWorkflowExecution>,
    concurrencySettings: ConcurrencySettings | undefined,
    coreStart: CoreStart,
    dependencies: ContextDependencies
  ): string | null {
    if (!concurrencySettings?.key) {
      return null;
    }

    // Guard check: ConcurrencyManager may not be initialized if task executes before start().
    // This should not occur in normal operation.
    if (!this.concurrencyManager) {
      this.logger.warn('ConcurrencyManager not initialized, skipping concurrency key evaluation.');
      return null;
    }

    const normalizedWorkflowExecution: EsWorkflowExecution = {
      scopeStack: [],
      error: null,
      startedAt: null,
      finishedAt: '',
      cancelRequested: false,
      duration: 0,
      ...workflowExecution,
    } as EsWorkflowExecution;

    return this.concurrencyManager.evaluateConcurrencyKey(
      concurrencySettings,
      buildWorkflowContext(normalizedWorkflowExecution, coreStart, dependencies)
    );
  }

  /**
   * Checks concurrency limits and applies collision strategy if needed.
   * This helper method consolidates the duplicated concurrency check logic.
   *
   * For 'drop' strategy: if limit is exceeded, ConcurrencyManager marks execution as SKIPPED.
   * For 'cancel-in-progress' strategy: ConcurrencyManager cancels old executions to make room.
   *
   * @param workflowExecution - The workflow execution (might be partial)
   * @returns Promise<boolean> - true if execution can proceed, false if it should be dropped
   */
  private async checkConcurrencyIfNeeded(
    workflowExecution: Partial<EsWorkflowExecution>
  ): Promise<boolean> {
    // Guard check: ConcurrencyManager not initialized if task executes before start().
    // This should not occur in normal operation.
    // Execution will proceed without concurrency enforcement.
    if (!this.concurrencyManager) {
      this.logger.warn(
        `ConcurrencyManager not initialized, skipping concurrency check for execution ${workflowExecution.id}.`
      );
      return true;
    }

    if (
      !workflowExecution.workflowDefinition?.settings?.concurrency ||
      !workflowExecution.concurrencyGroupKey ||
      !workflowExecution.id ||
      !workflowExecution.spaceId
    ) {
      return true; // No concurrency settings, allow execution
    }

    try {
      const canProceed = await this.concurrencyManager.checkConcurrency(
        workflowExecution.workflowDefinition.settings.concurrency,
        workflowExecution.concurrencyGroupKey,
        workflowExecution.id,
        workflowExecution.spaceId
      );

      if (!canProceed) {
        this.logger.debug(
          `Dropped workflow execution ${workflowExecution.id} (group: ${workflowExecution.concurrencyGroupKey}) due to concurrency limit`
        );
      }

      return canProceed;
    } catch (error) {
      // Best-effort concurrency enforcement: log error but allow execution to proceed
      // This prevents a single cancellation failure from blocking new executions
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.debug(
        `Failed to enforce concurrency limits for workflow execution ${workflowExecution.id} (group: ${workflowExecution.concurrencyGroupKey}): ${errorMessage}. Execution will proceed without concurrency enforcement.`
      );
      if (error instanceof Error) {
        this.logger.debug(`Concurrency enforcement error stack: ${error.stack}`);
      }
      return true; // On error, allow execution to proceed
    }
  }
}
