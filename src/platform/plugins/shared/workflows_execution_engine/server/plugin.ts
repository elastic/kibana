/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import { v4 as generateUuid } from 'uuid';
import type {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { ExecutionStatus, TerminalExecutionStatuses, WorkflowRepository } from '@kbn/workflows';
import type {
  ConcurrencySettings,
  EsWorkflowExecution,
  WorkflowExecutionEngineModel,
} from '@kbn/workflows';
import {
  WorkflowExecutionInvalidStatusError,
  WorkflowExecutionNotFoundError,
} from '@kbn/workflows/common/errors';
import { ConcurrencyManager } from './concurrency/concurrency_manager';
import type { WorkflowsExecutionEngineConfig } from './config';
import {
  checkAndSkipIfExistingScheduledExecution,
  resumeWorkflow,
  runWorkflow,
} from './execution_functions';
import { cancelWaitingWorkflow } from './lib/cancel_waiting_workflow';
import { checkLicense } from './lib/check_license';
import { getAuthenticatedUser } from './lib/get_user';
import {
  resolveExhaustedWorkflowRunTask,
  resolveInterruptedWorkflowResumeTask,
  resolveInterruptedWorkflowRunTask,
} from './lib/task_recovery';
import { WorkflowExecutionTelemetryClient } from './lib/telemetry/workflow_execution_telemetry_client';
import { validateWorkflowInputs } from './lib/validate_workflow_inputs';
import { WorkflowsMeteringService } from './metering/metering_service';
import { ConcurrencySemaphoreRepository } from './repositories/concurrency_semaphore_repository';
import { initializeLogsRepositoryDataStream } from './repositories/logs_repository/data_stream';
import { StepExecutionRepository } from './repositories/step_execution_repository';
import { WorkflowExecutionRepository } from './repositories/workflow_execution_repository';
import type {
  CancelAllActiveWorkflowExecutions,
  CancelWorkflowExecution,
  ExecuteWorkflow,
  ExecuteWorkflowStep,
  ResumeWorkflowExecution,
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
import {
  WORKFLOW_RESUME_TASK_TYPE,
  WORKFLOW_RUN_TASK_TYPE,
  WORKFLOW_SCHEDULED_TASK_TYPE,
} from './workflow_task_manager/types';
import { WorkflowTaskManager } from './workflow_task_manager/workflow_task_manager';
import { createIndexes } from '../common';

/**
 * Max Task Manager attempts for `workflow:run`.
 * - Attempt 1: normal `runWorkflow` execution.
 * - Attempts > 1: `resolveInterruptedWorkflowRunTask` runs first; when it marks the execution FAILED
 *   (interrupt recovery) the runner returns without re-executing user logic - so attempt 2 is not a
 *   second full workflow run in that case.
 * - A third attempt mainly covers transient failures persisting that recovery (e.g. ES unavailable)
 *   or a thrown error on attempt 1 where attempt 2 still runs recovery then `runWorkflow` again;
 *   it is not meant as extra user workflow retries after successful interrupt recovery.
 */
const WORKFLOW_RUN_TASK_MAX_ATTEMPTS = 3;

/**
 * Max Task Manager attempts for `workflow:resume`.
 * Same numeric budget as run but semantics differ: each attempt can run `resumeWorkflow` user logic
 * until interrupt recovery short-circuits or the last attempt applies `resolveExhaustedWorkflowRunTask`
 * after a handler failure - so extra attempts also cover resume work that runs and may throw.
 */
const WORKFLOW_RESUME_TASK_MAX_ATTEMPTS = 3;

/** Batch size for bulk cancel search_after paging (internal; not exposed on the public API). */
const BULK_CANCEL_PAGE_SIZE = 10;

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
  private concurrencySemaphoreRepository!: ConcurrencySemaphoreRepository;
  private workflowTaskManager!: WorkflowTaskManager;
  private workflowExecutionRepository!: WorkflowExecutionRepository;
  private setupDependencies?: SetupDependencies;
  private coreSetup?: CoreSetup<
    WorkflowsExecutionEnginePluginStartDeps,
    WorkflowsExecutionEnginePluginStart
  >;
  private meteringService?: WorkflowsMeteringService;
  private initializePromise?: Promise<void>;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<WorkflowsExecutionEngineConfig>();
  }

  public setup(
    core: CoreSetup<WorkflowsExecutionEnginePluginStartDeps, WorkflowsExecutionEnginePluginStart>,
    plugins: WorkflowsExecutionEnginePluginSetupDeps
  ) {
    this.logger.debug('Workflows execution engine setup');

    // Register telemetry event schemas
    WorkflowExecutionTelemetryClient.setup(core.analytics);

    const logger = this.logger;
    const config = this.config;

    this.coreSetup = core;

    initializeLogsRepositoryDataStream(core.dataStreams);

    const setupDependencies: SetupDependencies = { cloudSetup: plugins.cloud };
    this.setupDependencies = setupDependencies;

    // Initialize metering from the centralized Usage API plugin
    if (plugins.usageApi?.usageReporting) {
      this.meteringService = new WorkflowsMeteringService(
        plugins.usageApi?.usageReporting,
        this.logger.get('workflowsMetering')
      );
      this.logger.debug('Workflows metering service initialized');
    } else {
      this.logger.debug(
        'Workflows metering service not initialized: Usage API plugin is not available or not configured'
      );
    }

    plugins.taskManager.registerTaskDefinitions({
      [WORKFLOW_RUN_TASK_TYPE]: {
        title: 'Run Workflow',
        description: 'Executes a workflow immediately',
        // Set high timeout for long-running workflows.
        // This is high value to allow long-running workflows.
        // The workflow timeout logic defined in workflow execution engine logic is the primary control.
        timeout: '365d',
        // Retries allow `resolveInterruptedWorkflowRunTask` to fail-fast abandoned executions after interrupt.
        maxAttempts: WORKFLOW_RUN_TASK_MAX_ATTEMPTS,
        createTaskRunner: ({ taskInstance, fakeRequest }) => {
          if (!fakeRequest) {
            throw new Error('Cannot execute a workflow without Kibana Request');
          }
          const taskAbortController = new AbortController();
          return {
            run: async () => {
              const { workflowRunId, spaceId } =
                taskInstance.params as StartWorkflowExecutionParams;

              // Add queue delay metrics to APM trace for observability
              const now = Date.now();
              const scheduledAt = taskInstance.scheduledAt
                ? new Date(taskInstance.scheduledAt).getTime()
                : null;
              const queueDelayMs = scheduledAt ? now - scheduledAt : null;

              const { default: apm } = await import('elastic-apm-node');
              const currentTransaction = apm.currentTransaction;
              if (currentTransaction) {
                if (queueDelayMs !== null) {
                  currentTransaction.setLabel('queue_delay_ms', queueDelayMs);
                  currentTransaction.setLabel(
                    'queue_delay_seconds',
                    Math.round(queueDelayMs / 1000)
                  );
                }
                currentTransaction.setLabel('workflow_run_id', workflowRunId);
                currentTransaction.setLabel('space_id', spaceId);
              }

              const [coreStart, pluginsStart, workflowsExecutionEngine] =
                await core.getStartServices();
              await checkLicense(pluginsStart.licensing);

              await this.initialize(coreStart);
              const dependencies: ContextDependencies = {
                ...setupDependencies,
                coreStart,
                actions: pluginsStart.actions,
                taskManager: pluginsStart.taskManager,
                workflowsExtensions: pluginsStart.workflowsExtensions,
                config,
              };

              const workflowExecutionRepository = new WorkflowExecutionRepository(
                coreStart.elasticsearch.client.asInternalUser
              );

              const interruptedOutcome = await resolveInterruptedWorkflowRunTask({
                workflowExecutionRepository,
                workflowRunId,
                spaceId,
                taskAttempts: taskInstance.attempts,
                logger,
              });

              if (interruptedOutcome === 'task_complete') {
                return;
              }

              try {
                await runWorkflow({
                  workflowRunId,
                  spaceId,
                  taskAbortController,
                  config,
                  logger,
                  fakeRequest,
                  dependencies,
                  workflowsExecutionEngine,
                  meteringService: this.meteringService,
                  isEventDrivenExecutionEnabled:
                    workflowsExecutionEngine.isEventDrivenExecutionEnabled,
                });
              } catch (error) {
                await resolveExhaustedWorkflowRunTask({
                  workflowExecutionRepository,
                  workflowRunId,
                  spaceId,
                  taskAttempts: taskInstance.attempts,
                  maxAttempts: WORKFLOW_RUN_TASK_MAX_ATTEMPTS,
                  error,
                  logger,
                });
                throw error;
              } finally {
                await this.releaseSlotAndPromote(workflowRunId, spaceId, fakeRequest).catch((err) =>
                  this.logger.error(`Promotion failed after execution ${workflowRunId}: ${err}`)
                );
              }
            },
            cancel: async () => {
              taskAbortController.abort();
            },
          };
        },
      },
    });
    plugins.taskManager.registerTaskDefinitions({
      [WORKFLOW_RESUME_TASK_TYPE]: {
        title: 'Resume Workflow',
        description: 'Resumes a paused workflow',
        // Set high timeout for long-running workflows.
        // This is high value to allow long-running workflows.
        // The workflow timeout logic defined in workflow execution engine logic is the primary control.
        timeout: '365d',
        // Retries allow `resolveInterruptedWorkflowResumeTask` to fail-fast abandoned executions after interrupt.
        maxAttempts: WORKFLOW_RESUME_TASK_MAX_ATTEMPTS,
        createTaskRunner: ({ taskInstance, fakeRequest }) => {
          if (!fakeRequest) {
            throw new Error('Cannot resume a workflow without Kibana Request');
          }
          const taskAbortController = new AbortController();
          return {
            run: async () => {
              const { workflowRunId, spaceId } =
                taskInstance.params as ResumeWorkflowExecutionParams;

              // Add queue delay metrics to APM trace for observability
              const now = Date.now();
              const scheduledAt = taskInstance.scheduledAt
                ? new Date(taskInstance.scheduledAt).getTime()
                : null;
              const runAt = taskInstance.runAt ? new Date(taskInstance.runAt).getTime() : null;
              const queueDelayMs = scheduledAt ? now - scheduledAt : null;
              const resumeDelayMs = runAt ? now - runAt : null;

              const { default: apm } = await import('elastic-apm-node');
              const currentTransaction = apm.currentTransaction;
              if (currentTransaction) {
                if (queueDelayMs !== null) {
                  currentTransaction.setLabel('queue_delay_ms', queueDelayMs);
                  currentTransaction.setLabel(
                    'queue_delay_seconds',
                    Math.round(queueDelayMs / 1000)
                  );
                }
                if (resumeDelayMs !== null) {
                  currentTransaction.setLabel('resume_delay_ms', resumeDelayMs);
                }
                currentTransaction.setLabel('workflow_run_id', workflowRunId);
                currentTransaction.setLabel('space_id', spaceId);
              }

              const [coreStart, pluginsStart, workflowsExecutionEngine] =
                await core.getStartServices();
              await checkLicense(pluginsStart.licensing);

              await this.initialize(coreStart);
              const dependencies: ContextDependencies = {
                ...setupDependencies,
                coreStart,
                actions: pluginsStart.actions,
                taskManager: pluginsStart.taskManager,
                workflowsExtensions: pluginsStart.workflowsExtensions,
                config,
              };

              const workflowExecutionRepository = new WorkflowExecutionRepository(
                coreStart.elasticsearch.client.asInternalUser
              );

              const interruptedOutcome = await resolveInterruptedWorkflowResumeTask({
                workflowExecutionRepository,
                workflowRunId,
                spaceId,
                taskAttempts: taskInstance.attempts,
                logger,
              });

              if (interruptedOutcome === 'task_complete') {
                return;
              }

              try {
                await resumeWorkflow({
                  workflowRunId,
                  spaceId,
                  taskAbortController,
                  config,
                  logger,
                  fakeRequest,
                  dependencies,
                  workflowsExecutionEngine,
                  meteringService: this.meteringService,
                });
              } catch (error) {
                await resolveExhaustedWorkflowRunTask({
                  workflowExecutionRepository,
                  workflowRunId,
                  spaceId,
                  taskAttempts: taskInstance.attempts,
                  maxAttempts: WORKFLOW_RESUME_TASK_MAX_ATTEMPTS,
                  error,
                  logger,
                });
                throw error;
              } finally {
                await this.releaseSlotAndPromote(workflowRunId, spaceId, fakeRequest).catch((err) =>
                  this.logger.error(`Promotion failed after execution ${workflowRunId}: ${err}`)
                );
              }
            },
            cancel: async () => {
              taskAbortController.abort();
            },
          };
        },
      },
    });
    plugins.taskManager.registerTaskDefinitions({
      [WORKFLOW_SCHEDULED_TASK_TYPE]: {
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

              // Add queue delay metrics to APM trace for observability
              // This shows how long the task waited in the queue before execution
              const now = Date.now();
              const scheduledAt = taskInstance.scheduledAt
                ? new Date(taskInstance.scheduledAt).getTime()
                : null;
              const runAt = taskInstance.runAt ? new Date(taskInstance.runAt).getTime() : null;

              const queueDelayMs = scheduledAt ? now - scheduledAt : null;
              const scheduleDelayMs = runAt ? now - runAt : null;

              // Add labels to current APM transaction for queue visibility
              const { default: apm } = await import('elastic-apm-node');
              const currentTransaction = apm.currentTransaction;
              if (currentTransaction) {
                if (queueDelayMs !== null) {
                  currentTransaction.setLabel('queue_delay_ms', queueDelayMs);
                  currentTransaction.setLabel(
                    'queue_delay_seconds',
                    Math.round(queueDelayMs / 1000)
                  );
                }
                if (scheduleDelayMs !== null) {
                  currentTransaction.setLabel('schedule_delay_ms', scheduleDelayMs);
                }
                currentTransaction.setLabel('workflow_id', workflowId);
                currentTransaction.setLabel('space_id', spaceId);
              }

              logger.debug(
                `Workflow ${workflowId} queue metrics: queueDelayMs=${queueDelayMs}, scheduleDelayMs=${scheduleDelayMs}`
              );

              const [coreStart, pluginsStart] = await core.getStartServices();
              await checkLicense(pluginsStart.licensing);

              await this.initialize(coreStart);
              const dependencies: ContextDependencies = {
                ...setupDependencies,
                coreStart,
                actions: pluginsStart.actions,
                taskManager: pluginsStart.taskManager,
                workflowsExtensions: pluginsStart.workflowsExtensions,
                config,
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

              // Guard check: Check&Skip only when workflow has no concurrency strategy. When strategy is
              // set, the concurrency check (later) governs the limit and strategy.
              if (!workflow.definition?.settings?.concurrency?.strategy) {
                const wasSkipped = await checkAndSkipIfExistingScheduledExecution(
                  workflow,
                  spaceId,
                  workflowExecutionRepository,
                  taskInstance,
                  logger
                );
                if (wasSkipped) {
                  return;
                }
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

              // Extract user from fake request (contains API key of user who scheduled the workflow)
              const span = apm.startSpan(
                'workflow get authenticated user',
                'workflow',
                'execution'
              );
              const executedBy = await getAuthenticatedUser(
                fakeRequest,
                coreStart.security,
                coreStart.elasticsearch.client
              );
              span?.end();

              const workflowExecution: Partial<EsWorkflowExecution> = {
                id: generateUuid(),
                spaceId,
                workflowId: workflow.id,
                isTestRun: false,
                workflowDefinition: workflow.definition,
                yaml: workflow.yaml,
                context: executionContext,
                status: ExecutionStatus.PENDING,
                // Store task's runAt to link execution to specific scheduled run
                // runAt is stable across retries (retries use the same runAt but get a new startedAt)
                // This allows us to detect stale executions from previous scheduled runs
                taskRunAt: taskInstance.runAt?.toISOString() || null,
                createdAt: workflowCreatedAt.toISOString(),
                executedBy,
                triggeredBy: 'scheduled',
                // Store queue delay metrics for observability (only if enabled in config)
                ...(this.config.collectQueueMetrics
                  ? {
                      queueMetrics: {
                        scheduledAt: taskInstance.scheduledAt?.toString(),
                        runAt: taskInstance.runAt?.toString(),
                        startedAt: new Date(now).toISOString(),
                        queueDelayMs,
                        scheduleDelayMs,
                      },
                    }
                  : {}),
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

              // Use refresh: 'wait_for' to ensure the execution is immediately searchable
              // for deduplication checks by subsequent scheduled tasks
              await workflowExecutionRepository.createWorkflowExecution(workflowExecution, {
                refresh: 'wait_for',
              });

              // Check concurrency limits and apply collision strategy if needed
              const canProceed = await this.checkConcurrencyIfNeeded(workflowExecution);
              if (!canProceed) {
                await this.tryPromoteQueuedExecutions(workflowExecution, fakeRequest).catch((err) =>
                  this.logger.error(
                    `Promotion failed after queueing execution ${workflowExecution.id}: ${err}`
                  )
                );
                return;
              }

              if (!workflowExecution.id || !workflowExecution.spaceId) {
                throw new Error('Workflow execution must have id and spaceId');
              }

              const [, , workflowsExecutionEngine] = await core.getStartServices();

              try {
                await runWorkflow({
                  workflowRunId: workflowExecution.id,
                  spaceId: workflowExecution.spaceId,
                  taskAbortController,
                  logger,
                  config,
                  fakeRequest,
                  dependencies,
                  workflowsExecutionEngine,
                  meteringService: this.meteringService,
                });
              } finally {
                await this.releaseSlotAndPromote(
                  workflowExecution.id as string,
                  workflowExecution.spaceId as string,
                  fakeRequest
                ).catch((err) =>
                  this.logger.error(
                    `Promotion failed after execution ${workflowExecution.id}: ${err}`
                  )
                );
              }

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
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const workflowExecutionRepository = new WorkflowExecutionRepository(esClient);
    const workflowRepository = new WorkflowRepository({ esClient, logger: this.logger });
    const concurrencySemaphoreRepository = new ConcurrencySemaphoreRepository(esClient);
    this.workflowTaskManager = workflowTaskManager;
    this.workflowExecutionRepository = workflowExecutionRepository;
    this.concurrencySemaphoreRepository = concurrencySemaphoreRepository;
    this.concurrencyManager = new ConcurrencyManager(
      workflowTaskManager,
      workflowExecutionRepository,
      concurrencySemaphoreRepository
    );

    const dependencies: ContextDependencies = {
      ...this.setupDependencies,
      coreStart,
      actions: plugins.actions,
      taskManager: plugins.taskManager,
      workflowsExtensions: plugins.workflowsExtensions,
      config: this.config,
    };

    // Re-check that a workflow is still enabled right before persisting an
    // execution document.  The route-level check may have read a stale value
    // if a concurrent hard-delete disabled the workflow in the meantime.
    // Skipped for test runs — unsaved workflows don't exist in the index.
    const ensureWorkflowEnabled = async (
      workflow: WorkflowExecutionEngineModel,
      spaceId: string
    ) => {
      if (workflow.isTestRun) {
        return;
      }
      const stillEnabled = await workflowRepository.isWorkflowEnabled(workflow.id, spaceId);
      if (!stillEnabled) {
        throw new Error(`Workflow is disabled: ${workflow.id}. Enable the workflow to run it.`);
      }
    };

    // Helper function to create and persist a workflow execution
    const createAndPersistWorkflowExecution = async (
      workflow: WorkflowExecutionEngineModel,
      context: Record<string, unknown>,
      defaultTriggeredBy: string,
      request: KibanaRequest,
      options: { refresh: boolean | 'wait_for' } = { refresh: false }
    ): Promise<{
      workflowExecution: Partial<EsWorkflowExecution>;
      repository: WorkflowExecutionRepository;
    }> => {
      await this.initialize(coreStart);

      await ensureWorkflowEnabled(workflow, (context.spaceId as string | undefined) || 'default');

      const workflowCreatedAt = new Date();
      const triggeredBy = (context.triggeredBy as string | undefined) || defaultTriggeredBy;
      const executedBy = await getAuthenticatedUser(
        request,
        coreStart.security,
        coreStart.elasticsearch.client
      );
      const spaceId = (context.spaceId as string | undefined) || 'default';
      const metadata = context.metadata as Record<string, unknown> | undefined;
      const dispatchEventId =
        typeof metadata?.eventId === 'string' ? metadata.eventId.trim() || undefined : undefined;
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
        executedBy,
        triggeredBy,
        ...(metadata ? { metadata } : {}),
        ...(dispatchEventId ? { dispatchEventId } : {}),
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

      // Only pay the refresh cost when the concurrency check will actually run.
      // Without a concurrencyGroupKey there is no check, so refresh:false is fine.
      // When a check will run, the caller dictates the strategy: manual/UI paths use
      // refresh:true (immediate, no latency for the user); async paths use refresh:'wait_for'
      // (piggybacks on the scheduled cycle, lower cluster cost).
      await workflowExecutionRepository.createWorkflowExecution(workflowExecution, {
        refresh: concurrencyGroupKey ? options.refresh : false,
      });

      return { workflowExecution, repository: workflowExecutionRepository };
    };

    // Helper function to create a task instance
    const createTaskInstance = (
      workflowExecution: Partial<EsWorkflowExecution>,
      scope: string[]
    ) => {
      return {
        id: `workflow:${workflowExecution.id}:${workflowExecution.triggeredBy}`,
        taskType: WORKFLOW_RUN_TASK_TYPE,
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
      await checkLicense(plugins.licensing);

      // AUTO-DETECT: Check if we're already running in a Task Manager context
      const isRunningInTaskManager =
        (context.triggeredBy as string | undefined) === 'scheduled' ||
        (context.source as string | undefined) === 'task-manager' ||
        request?.isFakeRequest === true;

      // Child executions (triggered by a workflow step) must always be scheduled in their own task,
      // never run inline in the parent's task. Otherwise the parent's runtime is blocked until the
      // child becomes idle, and cancel/timeout on the parent cannot take effect until then.
      const isChildExecution = (context.triggeredBy as string | undefined) === 'workflow-step';

      if (!isRunningInTaskManager && !request) {
        throw new Error('Workflows cannot be executed without the user context');
      }

      // Test-only hook: simulate slow execution creation so Scout API tests
      // can deterministically reproduce the TOCTOU race in hardDeleteWorkflows.
      // Only honoured for internal API requests (KbnClient sets x-elastic-internal-origin).
      if (request?.isInternalApiRequest) {
        const raw = request.headers['x-kbn-test-run-delay-ms'];
        const delayMs = parseInt(String(Array.isArray(raw) ? raw[0] : raw ?? '0'), 10);
        if (delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }

      const { workflowExecution } = await createAndPersistWorkflowExecution(
        workflow,
        context,
        'manual',
        request,
        { refresh: true }
      );

      const executionId = workflowExecution.id;
      if (!executionId) {
        throw new Error('Workflow execution ID is required');
      }

      const inputsValid = await validateWorkflowInputs(
        workflow,
        context,
        executionId,
        workflowExecutionRepository,
        this.logger
      );
      if (!inputsValid) {
        return {
          workflowExecutionId: executionId,
        };
      }

      // Check concurrency limits and apply collision strategy if needed
      const canProceed = await this.checkConcurrencyIfNeeded(workflowExecution);
      if (!canProceed) {
        // For queue strategy, trigger promotion so the oldest queued execution
        // fills any available slot (the current execution was just enqueued at the back).
        await this.tryPromoteQueuedExecutions(workflowExecution, request).catch((err) =>
          this.logger.error(
            `Promotion failed after queueing execution ${workflowExecution.id}: ${err}`
          )
        );
        return {
          workflowExecutionId: executionId,
        };
      }

      if (isRunningInTaskManager && !isChildExecution) {
        // We're already in a task and this is not a child - execute directly without scheduling another task
        this.logger.debug(
          `Executing workflow directly (already in Task Manager context): ${workflow.id}`
        );

        if (!this.coreSetup) {
          throw new Error('Core setup not available');
        }
        const [, , workflowsExecutionEngine] = await this.coreSetup.getStartServices();

        try {
          await runWorkflow({
            workflowRunId: executionId,
            spaceId: workflowExecution.spaceId || 'default',
            taskAbortController: new AbortController(), // TODO: We need to think how to pass this properly from outer task
            logger: this.logger,
            config: this.config,
            fakeRequest: request,
            dependencies,
            workflowsExecutionEngine,
            meteringService: this.meteringService,
          });
        } finally {
          await this.releaseSlotAndPromote(
            executionId,
            workflowExecution.spaceId || 'default',
            request
          ).catch((err) =>
            this.logger.error(`Promotion failed after execution ${executionId}: ${err}`)
          );
        }
      } else {
        // Schedule a task: either we're not in a task, or this is a child execution (must not run inline)
        const taskInstance = createTaskInstance(workflowExecution, ['workflows']);
        await plugins.taskManager.schedule(taskInstance, { request: request as KibanaRequest });
        this.logger.debug(
          `Scheduling workflow task for workflow ${workflow.id}, execution ${workflowExecution.id}${
            isChildExecution ? ' (child execution)' : ''
          }`
        );
      }

      return {
        workflowExecutionId: executionId,
      };
    };

    const scheduleWorkflow: ScheduleWorkflow = async (workflow, context, request) => {
      await checkLicense(plugins.licensing);

      const { workflowExecution } = await createAndPersistWorkflowExecution(
        workflow,
        context,
        'alert',
        request,
        { refresh: 'wait_for' }
      );

      // Check concurrency limits and apply collision strategy if needed
      const canProceed = await this.checkConcurrencyIfNeeded(workflowExecution);
      if (!canProceed) {
        await this.tryPromoteQueuedExecutions(workflowExecution, request).catch((err) =>
          this.logger.error(
            `Promotion failed after queueing execution ${workflowExecution.id}: ${err}`
          )
        );
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
      executionContext,
      contextOverride,
      request
    ) => {
      await checkLicense(plugins.licensing);

      await this.initialize(coreStart);
      await ensureWorkflowEnabled(workflow, workflow.spaceId || 'default');

      const workflowCreatedAt = new Date();
      const context: Record<string, unknown> = {
        ...(executionContext ?? {}),
        contextOverride,
      };

      const triggeredBy = (context.triggeredBy as string | undefined) || 'manual'; // 'manual' or 'scheduled'
      const executedBy = await getAuthenticatedUser(
        request,
        coreStart.security,
        coreStart.elasticsearch.client
      );
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
        executedBy,
        triggeredBy,
      };

      await workflowExecutionRepository.createWorkflowExecution(workflowExecution);

      const taskInstance = {
        id: `workflow:${workflowExecution.id}:${workflowExecution.triggeredBy}`,
        taskType: WORKFLOW_RUN_TASK_TYPE,
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
      spaceId,
      request?
    ) => {
      await checkLicense(plugins.licensing);

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
        return;
      }

      // QUEUED and PENDING executions may have no TM task — cancel directly.
      // QUEUED never had a task; PENDING may be a zombie (promotion succeeded but
      // task scheduling failed). Either way, the task hasn't started running, so
      // a direct status transition is safe. Then release the semaphore slot (if held)
      // and promote the next queued execution to fill the freed slot.
      if (
        workflowExecution.status === ExecutionStatus.QUEUED ||
        workflowExecution.status === ExecutionStatus.PENDING
      ) {
        await workflowExecutionRepository.updateWorkflowExecution(
          {
            id: workflowExecution.id,
            status: ExecutionStatus.CANCELLED,
            cancelRequested: true,
            cancellationReason: 'Cancelled by user',
            cancelledAt: new Date().toISOString(),
            cancelledBy: 'system',
            finishedAt: new Date().toISOString(),
          },
          { refresh: 'wait_for' }
        );
        // PENDING executions hold a semaphore slot; QUEUED do not
        if (
          workflowExecution.status === ExecutionStatus.PENDING &&
          workflowExecution.concurrencyGroupKey &&
          workflowExecution.workflowDefinition?.settings?.concurrency?.strategy === 'queue'
        ) {
          await concurrencySemaphoreRepository
            .releaseSlot(workflowExecution.concurrencyGroupKey, spaceId, workflowExecutionId)
            .catch((err) =>
              this.logger.error(
                `Failed to release semaphore slot for cancelled PENDING execution ${workflowExecutionId}: ${err}`
              )
            );
        }
        if (request) {
          await this.releaseSlotAndPromote(workflowExecutionId, spaceId, request).catch((err) =>
            this.logger.error(`Promotion failed after cancelling ${workflowExecutionId}: ${err}`)
          );
        }
        return;
      }

      const cancelledAt = new Date().toISOString();

      if (workflowExecution.status === ExecutionStatus.WAITING_FOR_INPUT) {
        await cancelWaitingWorkflow({
          workflowExecution,
          workflowExecutionRepository,
          stepExecutionRepository: new StepExecutionRepository(
            coreStart.elasticsearch.client.asInternalUser
          ),
        });
        return;
      }

      await workflowExecutionRepository.updateWorkflowExecution({
        id: workflowExecution.id,
        cancelRequested: true,
        cancellationReason: 'Cancelled by user',
        cancelledAt,
        cancelledBy: 'system', // TODO: set user if available
      });
      await workflowTaskManager.forceRunIdleTasks(workflowExecution.id);

      // For queue-strategy workflows, a RUNNING execution holds a semaphore slot.
      // After a Kibana crash its TM task is orphaned (forceRunIdleTasks is a no-op),
      // so the slot would be phantom-locked forever unless we release it here.
      // Releasing eagerly is safe even when the TM task is live: the Painless
      // releaseSlot script is idempotent, and the task will terminate once it reads
      // cancelRequested. The double call to releaseSlotAndPromote in the task's
      // finally block will simply find the slot already gone (no-op).
      if (
        workflowExecution.concurrencyGroupKey &&
        workflowExecution.workflowDefinition?.settings?.concurrency?.strategy === 'queue' &&
        request
      ) {
        await this.releaseSlotAndPromote(workflowExecutionId, spaceId, request).catch((err) =>
          this.logger.error(
            `Promotion failed after cancelling RUNNING execution ${workflowExecutionId}: ${err}`
          )
        );
      }
    };

    const cancelAllActiveWorkflowExecutions: CancelAllActiveWorkflowExecutions = async ({
      spaceId,
      workflowId,
    }) => {
      await checkLicense(plugins.licensing);
      await this.initialize(coreStart);

      let searchAfter: estypes.SortResults | undefined;

      do {
        const page = await workflowExecutionRepository.findNonTerminalExecutionIdsByWorkflowIdPage({
          spaceId,
          workflowId,
          size: BULK_CANCEL_PAGE_SIZE,
          searchAfter,
        });

        if (page.results.length === 0) {
          break;
        }

        const outcomes = await Promise.allSettled(
          page.results.map((id) => cancelWorkflowExecution(id, spaceId))
        );

        outcomes.forEach((outcome, index) => {
          if (outcome.status === 'rejected') {
            const executionId = page.results[index];
            const message =
              outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
            this.logger.warn(
              `cancelAllActiveWorkflowExecutions: failed to cancel execution ${executionId}: ${message}`
            );
          }
        });

        searchAfter = page.nextSearchAfter;
      } while (searchAfter !== undefined);
    };

    const resumeWorkflowExecution: ResumeWorkflowExecution = async (
      executionId,
      spaceId,
      input,
      request
    ) => {
      await checkLicense(plugins.licensing);

      await this.initialize(coreStart);
      const workflowExecution = await workflowExecutionRepository.getWorkflowExecutionById(
        executionId,
        spaceId
      );

      if (!workflowExecution) {
        throw new WorkflowExecutionNotFoundError(executionId);
      }

      if (workflowExecution.status !== ExecutionStatus.WAITING_FOR_INPUT) {
        throw new WorkflowExecutionInvalidStatusError(
          executionId,
          workflowExecution.status,
          ExecutionStatus.WAITING_FOR_INPUT
        );
      }

      await workflowExecutionRepository.updateWorkflowExecution({
        id: executionId,
        context: { ...workflowExecution.context, resumeInput: input },
      });

      await workflowTaskManager.scheduleImmediateResume({
        executionId,
        spaceId,
        fakeRequest: request,
      });
    };

    const workflowEventLoggerService = new WorkflowEventLoggerService(
      coreStart.dataStreams,
      this.logger,
      this.config.logging.console
    );

    this.recoverOrphanedQueuedExecutions().catch((err) =>
      this.logger.warn(`Failed to recover orphaned queued executions on startup: ${err}`)
    );

    return {
      workflowEventLoggerService,
      executeWorkflow,
      executeWorkflowStep,
      scheduleWorkflow,
      cancelWorkflowExecution,
      cancelAllActiveWorkflowExecutions,
      resumeWorkflowExecution,
      isEventDrivenExecutionEnabled: this.isEventDrivenExecutionEnabled.bind(this),
      isLogTriggerEventsEnabled: this.isLogTriggerEventsEnabled.bind(this),
      getMaxEventChainDepth: this.getMaxEventChainDepth.bind(this),
      getMaxWorkflowDepth: this.getMaxWorkflowDepth.bind(this),
    };
  }

  public stop() {}

  private isEventDrivenExecutionEnabled(): boolean {
    return this.config?.eventDriven?.enabled ?? true;
  }

  private isLogTriggerEventsEnabled(): boolean {
    return this.config?.eventDriven?.logEvents ?? true;
  }

  private getMaxEventChainDepth(): number {
    return this.config?.eventDriven?.maxChainDepth ?? 10;
  }

  private getMaxWorkflowDepth(): number {
    return this.config?.maxWorkflowDepth ?? 10;
  }

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
   * For 'queue' strategy: always returns false (execution is queued for FIFO promotion).
   * For 'drop' strategy: if limit is exceeded, ConcurrencyManager marks execution as SKIPPED.
   * For 'cancel-in-progress' strategy: ConcurrencyManager cancels old executions to make room.
   *
   * @param workflowExecution - The workflow execution (might be partial)
   * @returns Promise<boolean> - true if execution can proceed, false if it should be dropped/queued
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      const strategy = workflowExecution.workflowDefinition?.settings?.concurrency?.strategy;

      if (strategy === 'queue' && workflowExecution.id) {
        // Queue strategy must not bypass the limit on error — queue the execution
        // so it can be promoted later when a slot frees up.
        this.logger.warn(
          `Concurrency enforcement error for queue-strategy execution ${workflowExecution.id} (group: ${workflowExecution.concurrencyGroupKey}): ${errorMessage}. Queueing execution instead of bypassing limit.`
        );
        await this.workflowExecutionRepository?.updateWorkflowExecution({
          id: workflowExecution.id,
          status: ExecutionStatus.QUEUED,
        });
        return false;
      }

      // For drop/cancel-in-progress strategies, best-effort: allow execution to
      // proceed so a transient ES error doesn't block new work entirely.
      this.logger.debug(
        `Failed to enforce concurrency limits for workflow execution ${workflowExecution.id} (group: ${workflowExecution.concurrencyGroupKey}): ${errorMessage}. Execution will proceed without concurrency enforcement.`
      );
      if (error instanceof Error) {
        this.logger.debug(`Concurrency enforcement error stack: ${error.stack}`);
      }
      return true;
    }
  }

  /**
   * Triggers promotion of the oldest QUEUED executions for a queue-strategy
   * workflow. Extracts the concurrency group key and max from the execution's
   * workflow definition, then delegates to promoteFromQueue().
   *
   * Called by entry points (executeWorkflow, scheduleWorkflow, workflow:scheduled)
   * after checkConcurrencyIfNeeded returns false for a queue-strategy execution,
   * so that any available slots are filled with the oldest queued items (FIFO).
   */
  private async tryPromoteQueuedExecutions(
    workflowExecution: Partial<EsWorkflowExecution>,
    fakeRequest: KibanaRequest
  ): Promise<void> {
    const concurrency = workflowExecution.workflowDefinition?.settings?.concurrency;
    if (
      concurrency?.strategy !== 'queue' ||
      !workflowExecution.concurrencyGroupKey ||
      !workflowExecution.spaceId
    ) {
      return;
    }

    await this.promoteFromQueue(
      workflowExecution.concurrencyGroupKey,
      workflowExecution.spaceId,
      concurrency.max ?? 1,
      fakeRequest
    );
  }

  /**
   * Promotes the oldest QUEUED executions into free semaphore slots and
   * schedules Task Manager tasks for them (FIFO order).
   *
   * Flow:
   * 1. Fetch QUEUED executions ordered by createdAt ascending
   * 2. For each, atomically acquire a semaphore slot
   * 3. If acquired, promote QUEUED → PENDING and schedule a TM task
   * 4. If scheduling fails, release the slot and revert to QUEUED
   *
   * Called from two places:
   * - releaseSlotAndPromote (after an execution completes — slot just freed)
   * - callers of checkConcurrencyIfNeeded (after a new execution is queued —
   *   fills any slots that may have opened since the last promotion)
   */
  private async promoteFromQueue(
    concurrencyGroupKey: string,
    spaceId: string,
    max: number,
    fakeRequest: KibanaRequest
  ): Promise<void> {
    if (
      !this.workflowExecutionRepository ||
      !this.workflowTaskManager ||
      !this.concurrencySemaphoreRepository
    ) {
      return;
    }

    // Fetch candidates from the queue (grab a few more than max to allow for
    // concurrent promoters on other nodes — extras will simply fail to acquire a slot)
    const queued = await this.workflowExecutionRepository.getQueuedExecutionsByConcurrencyGroup(
      concurrencyGroupKey,
      spaceId,
      max
    );

    for (const exec of queued) {
      const acquired = await this.concurrencySemaphoreRepository.tryAcquireSlot(
        concurrencyGroupKey,
        spaceId,
        exec.id,
        max
      );

      if (!acquired) {
        break; // All slots occupied — remaining queued items can't proceed
      }

      const result = await this.workflowExecutionRepository.promoteQueuedExecution(exec.id);
      if (result === 'updated') {
        try {
          await this.workflowTaskManager.scheduleExecutionTask({
            executionId: exec.id,
            workflowId: exec.workflowId,
            spaceId,
            fakeRequest,
          });
        } catch (err) {
          this.logger.error(
            `Failed to schedule promoted execution ${exec.id}, reverting to QUEUED: ${err}`
          );
          await this.concurrencySemaphoreRepository
            .releaseSlot(concurrencyGroupKey, spaceId, exec.id)
            .catch((releaseErr) =>
              this.logger.error(
                `Failed to release semaphore slot for reverted execution ${exec.id}: ${releaseErr}`
              )
            );
          await this.workflowExecutionRepository
            .updateWorkflowExecution(
              { id: exec.id, status: ExecutionStatus.QUEUED },
              { refresh: 'wait_for' }
            )
            .catch((revertErr) =>
              this.logger.error(`Failed to revert execution ${exec.id} to QUEUED: ${revertErr}`)
            );
        }
      } else {
        // Execution was no longer QUEUED — either promoted by another concurrent
        // promoter (PENDING/RUNNING) or cancelled/completed.
        // Only release the semaphore slot if the execution is terminal. If it's
        // still active, the slot is legitimately held by the other promoter and
        // releasing it would create a phantom free slot, allowing over-promotion.
        const current = await this.workflowExecutionRepository.getWorkflowExecutionById(
          exec.id,
          spaceId
        );
        if (!current || TerminalExecutionStatuses.includes(current.status)) {
          await this.concurrencySemaphoreRepository
            .releaseSlot(concurrencyGroupKey, spaceId, exec.id)
            .catch(() => {});
        }
      }
    }
  }

  /**
   * Releases the semaphore slot held by a completed/failed execution and then
   * promotes queued executions to fill freed slots.
   *
   * Early-returns for non-queue workflows so there's zero overhead for
   * drop/cancel-in-progress strategies.
   */
  private async releaseSlotAndPromote(
    workflowRunId: string,
    spaceId: string,
    fakeRequest: KibanaRequest
  ): Promise<void> {
    if (
      !this.workflowExecutionRepository ||
      !this.workflowTaskManager ||
      !this.concurrencySemaphoreRepository
    ) {
      return;
    }

    const execution = await this.workflowExecutionRepository.getWorkflowExecutionById(
      workflowRunId,
      spaceId
    );
    const concurrency = execution?.workflowDefinition?.settings?.concurrency;

    if (concurrency?.strategy !== 'queue' || !execution?.concurrencyGroupKey) {
      return;
    }

    const groupKey = execution.concurrencyGroupKey;
    const max = concurrency.max ?? 1;

    if (TerminalExecutionStatuses.includes(execution.status)) {
      await this.concurrencySemaphoreRepository.releaseSlot(groupKey, spaceId, workflowRunId);
    }

    await this.promoteFromQueue(groupKey, spaceId, max, fakeRequest);
  }

  /**
   * Recovers orphaned QUEUED executions after a Kibana restart.
   * Also detects stuck PENDING executions from queue-strategy workflows and
   * reverts them to QUEUED so they can be re-promoted with fresh TM tasks.
   *
   * Additionally reconciles the concurrency semaphore documents to remove stale
   * slots left by executions that terminated without releasing (e.g. Kibana crash).
   *
   * QUEUED docs have no TM task, so if Kibana restarts while executions are queued
   * and the group has no running executions, the queue would be permanently stuck.
   * PENDING docs from a failed promotion (TM task never scheduled) block the
   * concurrency slot and prevent any queued executions from being promoted.
   */
  private async recoverOrphanedQueuedExecutions(): Promise<void> {
    if (!this.workflowExecutionRepository || !this.workflowTaskManager) {
      return;
    }

    // Track concurrency groups that need semaphore reconciliation
    const groupsToReconcile = new Set<string>();

    // Revert stuck PENDING executions from queue-strategy workflows back to QUEUED.
    // A PENDING execution without a running TM task blocks the concurrency slot forever.
    // On restart, it's safe to revert because any legitimate TM task from the previous
    // instance would need to be re-created anyway.
    // Uses refresh: 'wait_for' so the revert is visible before the active-count query below.
    const stuckPending = await this.workflowExecutionRepository.searchWorkflowExecutions(
      {
        bool: {
          filter: [
            { term: { status: ExecutionStatus.PENDING } },
            { exists: { field: 'concurrencyGroupKey' } },
          ],
        },
      },
      10000
    );

    for (const hit of stuckPending) {
      const doc = hit._source;
      if (doc?.id && doc.workflowDefinition?.settings?.concurrency?.strategy === 'queue') {
        if (doc.concurrencyGroupKey) {
          groupsToReconcile.add(`${doc.spaceId}:${doc.concurrencyGroupKey}`);
        }

        if (doc.cancelRequested) {
          this.logger.info(
            `Completing cancellation of stuck PENDING execution ${doc.id} (cancel was requested)`
          );
          await this.workflowExecutionRepository
            .updateWorkflowExecution(
              {
                id: doc.id,
                status: ExecutionStatus.CANCELLED,
                finishedAt: new Date().toISOString(),
              },
              { refresh: 'wait_for' }
            )
            .catch((err) =>
              this.logger.error(`Failed to cancel stuck PENDING execution ${doc.id}: ${err}`)
            );
        } else {
          this.logger.info(
            `Reverting stuck PENDING execution ${doc.id} to QUEUED for re-promotion`
          );
          await this.workflowExecutionRepository
            .updateWorkflowExecution(
              { id: doc.id, status: ExecutionStatus.QUEUED },
              { refresh: 'wait_for' }
            )
            .catch((err) =>
              this.logger.error(`Failed to revert PENDING execution ${doc.id} to QUEUED: ${err}`)
            );
        }
      }
    }

    // Terminate stuck RUNNING/WAITING/WAITING_FOR_INPUT executions from queue-strategy workflows.
    // When Kibana crashes, these executions lose their TM task but remain in an active state,
    // phantom-locking semaphore slots. The PENDING recovery above does not cover these because
    // RUNNING executions were never handled. Without this fix, all concurrency slots stay
    // occupied after a restart and the queue is permanently stuck.
    // Mark them FAILED (or CANCELLED if cancellation was already requested) and add their
    // groups to the reconcile set so the semaphore is cleaned up below.
    const stuckActive = await this.workflowExecutionRepository.searchWorkflowExecutions(
      {
        bool: {
          filter: [
            {
              terms: {
                status: [
                  ExecutionStatus.RUNNING,
                  ExecutionStatus.WAITING,
                  ExecutionStatus.WAITING_FOR_INPUT,
                ],
              },
            },
            { exists: { field: 'concurrencyGroupKey' } },
          ],
        },
      },
      10000
    );

    for (const hit of stuckActive) {
      const doc = hit._source;
      if (doc?.id && doc.workflowDefinition?.settings?.concurrency?.strategy === 'queue') {
        if (doc.concurrencyGroupKey) {
          groupsToReconcile.add(`${doc.spaceId}:${doc.concurrencyGroupKey}`);
        }

        if (doc.cancelRequested) {
          this.logger.info(
            `Completing cancellation of orphaned ${doc.status} execution ${doc.id} (cancel was requested)`
          );
          await this.workflowExecutionRepository
            .updateWorkflowExecution(
              {
                id: doc.id,
                status: ExecutionStatus.CANCELLED,
                finishedAt: new Date().toISOString(),
              },
              { refresh: 'wait_for' }
            )
            .catch((err) =>
              this.logger.error(
                `Failed to cancel orphaned ${doc.status} execution ${doc.id}: ${err}`
              )
            );
        } else {
          this.logger.info(
            `Marking orphaned ${doc.status} execution ${doc.id} as FAILED (lost TM task on restart)`
          );
          await this.workflowExecutionRepository
            .updateWorkflowExecution(
              {
                id: doc.id,
                status: ExecutionStatus.FAILED,
                finishedAt: new Date().toISOString(),
                error: {
                  type: 'KibanaRestartError',
                  message:
                    'Execution interrupted: Kibana restarted while the workflow was running.',
                },
              },
              { refresh: 'wait_for' }
            )
            .catch((err) =>
              this.logger.error(
                `Failed to mark orphaned ${doc.status} execution ${doc.id} as FAILED: ${err}`
              )
            );
        }
      }
    }

    // Reconcile semaphore documents for affected concurrency groups.
    // After terminating stuck executions, the semaphore's activeSlots may contain
    // stale IDs from executions that are no longer running. Query the actual active
    // executions and overwrite the semaphore to match reality.
    if (this.concurrencySemaphoreRepository) {
      for (const groupCompositeKey of groupsToReconcile) {
        const [groupSpaceId, ...keyParts] = groupCompositeKey.split(':');
        const groupKey = keyParts.join(':');
        const actualActive =
          await this.workflowExecutionRepository.getRunningExecutionsByConcurrencyGroup(
            groupKey,
            groupSpaceId
          );
        await this.concurrencySemaphoreRepository
          .reconcileSlots(groupKey, groupSpaceId, actualActive)
          .catch((err) =>
            this.logger.warn(`Failed to reconcile semaphore for group ${groupKey}: ${err}`)
          );
      }
    }

    // Note: we intentionally do NOT promote QUEUED → PENDING here because
    // scheduling a TM task requires the user's request/API-key context, which
    // is unavailable during a server restart. Queued executions will be promoted
    // when the next workflow execution completes (via releaseSlotAndPromote)
    // or when a user cancels a stuck execution.
    const hasQueued = await this.workflowExecutionRepository.searchWorkflowExecutions(
      { bool: { filter: [{ term: { status: ExecutionStatus.QUEUED } }] } },
      1
    );
    if (hasQueued.length > 0 || stuckPending.length > 0 || stuckActive.length > 0) {
      this.logger.info(
        `Queue recovery: cleaned up ${stuckPending.length} stuck PENDING executions, ` +
          `terminated ${stuckActive.length} orphaned active executions, ` +
          `reconciled ${groupsToReconcile.size} semaphore group(s). ` +
          `QUEUED executions remain and will drain on the next trigger.`
      );
    }
  }
}
