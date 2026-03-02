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
import { ExecutionStatus, TerminalExecutionStatuses, WorkflowRepository } from '@kbn/workflows';
import type {
  ConcurrencySettings,
  EsWorkflowExecution,
  WorkflowExecutionEngineModel,
} from '@kbn/workflows';
import { WorkflowExecutionNotFoundError } from '@kbn/workflows/common/errors';
import { ConcurrencyManager } from './concurrency/concurrency_manager';
import type { WorkflowsExecutionEngineConfig } from './config';
import {
  checkAndSkipIfExistingScheduledExecution,
  resumeWorkflow,
  runWorkflow,
} from './execution_functions';
import { checkLicense } from './lib/check_license';
import { getAuthenticatedUser } from './lib/get_user';
import { WorkflowExecutionTelemetryClient } from './lib/telemetry/workflow_execution_telemetry_client';
import { WorkflowsMeteringService } from './metering/metering_service';
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
              };

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
                });
              } finally {
                await this.promoteNextQueuedIfNeeded(workflowRunId, spaceId, fakeRequest).catch(
                  (err) =>
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
              };

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
              } finally {
                await this.promoteNextQueuedIfNeeded(workflowRunId, spaceId, fakeRequest).catch(
                  (err) =>
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
                // Execution was dropped due to concurrency limit, skip running
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
                await this.promoteNextQueuedIfNeeded(
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
    const workflowExecutionRepository = new WorkflowExecutionRepository(
      coreStart.elasticsearch.client.asInternalUser
    );
    this.workflowTaskManager = workflowTaskManager;
    this.workflowExecutionRepository = workflowExecutionRepository;
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
      defaultTriggeredBy: string,
      request: KibanaRequest
    ): Promise<{
      workflowExecution: Partial<EsWorkflowExecution>;
      repository: WorkflowExecutionRepository;
    }> => {
      await this.initialize(coreStart);
      const workflowCreatedAt = new Date();
      const triggeredBy = (context.triggeredBy as string | undefined) || defaultTriggeredBy;
      const executedBy = await getAuthenticatedUser(
        request,
        coreStart.security,
        coreStart.elasticsearch.client
      );
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
        executedBy,
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

      const { workflowExecution } = await createAndPersistWorkflowExecution(
        workflow,
        context,
        'manual',
        request
      );

      // Check concurrency limits and apply collision strategy if needed
      const canProceed = await this.checkConcurrencyIfNeeded(workflowExecution);
      if (!canProceed) {
        // Execution was dropped due to concurrency limit, return execution ID
        return {
          workflowExecutionId: workflowExecution.id as string,
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
            workflowRunId: workflowExecution.id as string,
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
          await this.promoteNextQueuedIfNeeded(
            workflowExecution.id as string,
            workflowExecution.spaceId || 'default',
            request
          ).catch((err) =>
            this.logger.error(`Promotion failed after execution ${workflowExecution.id}: ${err}`)
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
        workflowExecutionId: workflowExecution.id as string,
      };
    };

    const scheduleWorkflow: ScheduleWorkflow = async (workflow, context, request) => {
      await checkLicense(plugins.licensing);

      const { workflowExecution } = await createAndPersistWorkflowExecution(
        workflow,
        context,
        'alert',
        request
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
      await checkLicense(plugins.licensing);

      await this.initialize(coreStart);
      const workflowCreatedAt = new Date();
      const context: Record<string, unknown> = {
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
      // a direct status transition is safe. Then promote the next queued execution
      // to fill the freed slot.
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
        if (request) {
          await this.promoteNextQueuedIfNeeded(workflowExecutionId, spaceId, request).catch((err) =>
            this.logger.error(`Promotion failed after cancelling ${workflowExecutionId}: ${err}`)
          );
        }
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

    this.recoverOrphanedQueuedExecutions().catch((err) =>
      this.logger.warn(`Failed to recover orphaned queued executions on startup: ${err}`)
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

  /**
   * After an execution completes (success or failure), checks whether there are queued
   * executions for the same concurrency group that can now be promoted and scheduled.
   *
   * Early-returns for non-queue workflows so there's zero overhead for drop/cancel-in-progress.
   */
  private async promoteNextQueuedIfNeeded(
    workflowRunId: string,
    spaceId: string,
    fakeRequest: KibanaRequest
  ): Promise<void> {
    if (!this.workflowExecutionRepository || !this.workflowTaskManager) {
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

    const max = concurrency.max ?? 1;

    // Conditionally exclude the triggering execution from the active count:
    // - Terminal (COMPLETED/FAILED/…): exclude it, because the ES search index may not yet
    //   reflect the status update (near-real-time lag) and would still count it as active.
    // - Non-terminal (WAITING for resume, etc.): do NOT exclude — it still occupies a slot.
    const excludeId = TerminalExecutionStatuses.includes(execution.status)
      ? workflowRunId
      : undefined;
    const activeIds = await this.workflowExecutionRepository.getRunningExecutionsByConcurrencyGroup(
      execution.concurrencyGroupKey,
      spaceId,
      excludeId
    );
    const availableSlots = max - activeIds.length;

    if (availableSlots <= 0) {
      return;
    }

    const queued = await this.workflowExecutionRepository.getQueuedExecutionsByConcurrencyGroup(
      execution.concurrencyGroupKey,
      spaceId,
      availableSlots
    );

    for (const exec of queued) {
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
          await this.workflowExecutionRepository
            .updateWorkflowExecution(
              { id: exec.id, status: ExecutionStatus.QUEUED },
              { refresh: 'wait_for' }
            )
            .catch((revertErr) =>
              this.logger.error(`Failed to revert execution ${exec.id} to QUEUED: ${revertErr}`)
            );
        }
      }
    }
  }

  /**
   * Recovers orphaned QUEUED executions after a Kibana restart.
   * Also detects stuck PENDING executions from queue-strategy workflows and
   * reverts them to QUEUED so they can be re-promoted with fresh TM tasks.
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

    // Note: we intentionally do NOT promote QUEUED → PENDING here because
    // scheduling a TM task requires the user's request/API-key context, which
    // is unavailable during a server restart. Queued executions will be promoted
    // when the next workflow execution completes (via promoteNextQueuedIfNeeded)
    // or when a user cancels a stuck execution.
    const hasQueued = await this.workflowExecutionRepository.searchWorkflowExecutions(
      { bool: { filter: [{ term: { status: ExecutionStatus.QUEUED } }] } },
      1
    );
    if (hasQueued.length > 0 || stuckPending.length > 0) {
      this.logger.info(
        `Queue recovery: cleaned up ${stuckPending.length} stuck PENDING executions. ` +
          `QUEUED executions remain and will drain on the next trigger.`
      );
    }
  }
}
