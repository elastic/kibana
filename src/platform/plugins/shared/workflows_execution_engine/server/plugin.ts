/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';
import { schema } from '@kbn/config-schema';
import type {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import {
  ExecutionStatus,
  isTerminalStatus,
  isWorkflowStepTriggered,
  toWorkflowExecutionEngineModel,
  WorkflowRepository,
} from '@kbn/workflows';
import type { EsWorkflowExecution, WorkflowSettings } from '@kbn/workflows';
import { ConcurrencyManager } from './concurrency/concurrency_manager';
import { maybeDrainConcurrencyQueueBeforeEnqueue } from './concurrency/concurrency_queue_drainer';
import { handleConcurrencyBlockedExecution } from './concurrency/maybe_schedule_dormant_queued_run';
import type { WorkflowsExecutionEngineConfig } from './config';
import {
  cancelWorkflow,
  checkAndSkipIfExistingScheduledExecution,
  resumeWorkflow,
  runWorkflow,
} from './execution_functions';
import { handlePostExecutionLoop } from './execution_functions/handle_post_execution_loop';
import { resumeWaitingWorkflowExecution } from './execution_functions/resume_waiting_workflow_execution';
import { buildWorkflowExecutionDocument } from './lib/build_workflow_execution_document';
import { checkLicense } from './lib/check_license';
import { ensureWorkflowsDataStreamsRolledOver } from './lib/data_streams/ensure_data_streams_rolled_over';
import { ensureBoundExecutionAdmitted } from './lib/ensure_bound_execution_admitted';
import {
  MISSING_EXECUTION_IDENTITY_MESSAGE,
  UNKNOWN_EXECUTION_IDENTITY,
} from './lib/execution_identity';
import { getAuthenticatedUser } from './lib/get_user';
import { hasWorkflowAccess } from './lib/has_workflow_access';
import { logWorkflowTaskFailure } from './lib/log_workflow_task_failure';
import { scheduleRunTaskOrMarkFailed } from './lib/schedule_workflow_run_task';
import {
  failExecutionMissingIdentity,
  markScheduledExecutionFailedAfterTaskError,
  resolveExhaustedWorkflowRunTask,
  resolveInterruptedWorkflowResumeTask,
  resolveInterruptedWorkflowRunTask,
} from './lib/task_recovery';
import { WorkflowExecutionTelemetryClient } from './lib/telemetry/workflow_execution_telemetry_client';
import { validateWorkflowInputs } from './lib/validate_workflow_inputs';
import {
  getExecutionForTaskRunEvent,
  mapExecutionStatusToOutcome,
  mapInterruptCompleteReasonToOutcome,
  stampWorkflowTaskRunEventFields,
} from './lib/workflow_task_run_event_fields';
import { WorkflowsMeteringService } from './metering/metering_service';
import { createDataClientBundle, type DataClientBundle } from './repositories/data_access_layer';
import { LogsRepository } from './repositories/logs_repository';
import { initializeLogsRepositoryDataStream } from './repositories/logs_repository/data_stream';
import { StepExecutionRepository } from './repositories/step_execution_repository';
import { WorkflowExecutionRepository } from './repositories/workflow_execution_repository';
import {
  checkConcurrencyIfNeeded,
  createBulkScheduleWorkflow,
  createScheduleWorkflow,
  createSchedulingHelpers,
  getConcurrencyGroupKey,
} from './scheduling';
import type { SchedulingDeps } from './scheduling';
import {
  getWorkflowOriginalRequest,
  WORKFLOW_SERVICE_ACCOUNT_TYPE,
} from './service_account_execution';
import { resolveWorkflowWorkloads } from './service_account_workload_resolver';
import { initializeTriggerEventsDataStream, TriggerEventHandler } from './trigger_events';
import { initializeTriggerEventsClient } from './trigger_events/event_logs';
import { searchTriggerEventLog as querySearchTriggerEventLog } from './trigger_events/event_logs/trigger_event_log_query';
import type {
  CancelAllActiveWorkflowExecutions,
  CancelWorkflowExecution,
  ExecuteWorkflow,
  ExecuteWorkflowStep,
  InternalResumeWorkflowExecution,
  ResumeWorkflowExecution,
  ScheduleWorkflow,
  TriggerEventsContract,
  WorkflowsExecutionEnginePluginSetup,
  WorkflowsExecutionEnginePluginSetupDeps,
  WorkflowsExecutionEnginePluginStart,
  WorkflowsExecutionEnginePluginStartDeps,
} from './types';
import { generateExecutionTaskScope } from './utils';
import type { ContextDependencies } from './workflow_context_manager/types';
import { WorkflowLogsQueryService } from './workflow_event_logger';
import type {
  ResumeWorkflowExecutionParams,
  StartWorkflowExecutionParams,
} from './workflow_task_manager/types';
import {
  WORKFLOW_RESUME_TASK_TYPE,
  WORKFLOW_RUN_TASK_TYPE,
  WORKFLOW_SCHEDULED_TASK_TYPE,
} from './workflow_task_manager/types';
import {
  getTaskPriority,
  getWorkflowImmediateResumeTaskId,
  getWorkflowWakeTaskId,
  WORKFLOW_PARKED_RUNNER_DELAY_MS,
  WORKFLOW_WAKE_POLL_INTERVAL_MS,
  WorkflowTaskManager,
} from './workflow_task_manager/workflow_task_manager';
import { createWorkflowTaskAbortController } from './workflow_task_shutdown';

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

const WORKFLOW_SCHEDULED_TASK_MAX_ATTEMPTS = 3;

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
  private setupDependencies?: SetupDependencies;
  private coreSetup?: CoreSetup<
    WorkflowsExecutionEnginePluginStartDeps,
    WorkflowsExecutionEnginePluginStart
  >;
  private meteringService?: WorkflowsMeteringService;

  /** Set in start(); used by task runners to pass parent-resume into run/resume without exposing it on the public plugin contract. */
  private internalResumeWorkflowExecutionHandler?: InternalResumeWorkflowExecution;

  private dataClientBundle!: DataClientBundle;

  private createScopedRepositories(): {
    workflowExecutionRepository: WorkflowExecutionRepository;
    stepExecutionRepository: StepExecutionRepository;
  } {
    const workflowExecutionsDataClient = this.dataClientBundle.createWorkflowDataClient();
    const stepExecutionsDataClient = this.dataClientBundle.createStepDataClient();
    return {
      workflowExecutionRepository: new WorkflowExecutionRepository(workflowExecutionsDataClient),
      stepExecutionRepository: new StepExecutionRepository(stepExecutionsDataClient),
    };
  }

  /**
   * Completes a claimed `workflow:run` / `workflow:resume` task that has no
   * Task Manager identity by failing the persisted execution instead of leaving
   * it pending.
   */
  private createMissingIdentityTaskRunner({
    workflowRunId,
    spaceId,
    setCustomTaskRunEventFields,
  }: {
    workflowRunId: string;
    spaceId: string;
    setCustomTaskRunEventFields: (fields: Record<string, unknown>) => void;
  }): { run: () => Promise<void>; cancel: () => Promise<void> } {
    return {
      run: async () => {
        const { workflowExecutionRepository, stepExecutionRepository } =
          this.createScopedRepositories();
        await failExecutionMissingIdentity({
          workflowExecutionRepository,
          stepExecutionRepository,
          workflowRunId,
          spaceId,
          logger: this.logger,
        });
        const execution = await getExecutionForTaskRunEvent(
          workflowExecutionRepository,
          workflowRunId,
          spaceId,
          this.logger
        );
        stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
          workflow_execution_id: workflowRunId,
          workflow_id: execution?.workflowId,
          space_id: spaceId,
          outcome: 'failed',
        });
      },
      cancel: async () => {
        stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
          workflow_execution_id: workflowRunId,
          space_id: spaceId,
          outcome: 'cancelled',
        });
      },
    };
  }

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
    core.security.serviceAccounts.registerWorkloadType({
      type: WORKFLOW_SERVICE_ACCOUNT_TYPE,
      name: 'Workflow',
      resolveWorkloads: async (workloads, options) => {
        const [coreStart] = await core.getStartServices();
        return resolveWorkflowWorkloads(
          new WorkflowRepository({
            esClient: coreStart.elasticsearch.client.asInternalUser,
            logger,
          }),
          workloads,
          options
        );
      },
    });

    initializeLogsRepositoryDataStream(core.dataStreams);
    initializeTriggerEventsDataStream(core.dataStreams);

    this.dataClientBundle = createDataClientBundle({
      source: config.storage.source,
      dataRetention: config.storage.dataRetention,
      logger: this.logger,
    });
    void this.dataClientBundle.initSetup(core);

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
        createTaskRunner: ({ taskInstance, fakeRequest, signal, setCustomTaskRunEventFields }) => {
          const { workflowRunId, spaceId } = taskInstance.params as StartWorkflowExecutionParams;
          if (!fakeRequest) {
            return this.createMissingIdentityTaskRunner({
              workflowRunId,
              spaceId,
              setCustomTaskRunEventFields,
            });
          }
          const taskAbortController = createWorkflowTaskAbortController(signal);
          return {
            run: async () => {
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

              const dependencies: ContextDependencies = {
                ...setupDependencies,
                coreStart,
                actions: pluginsStart.actions,
                taskManager: pluginsStart.taskManager,
                workflowsExtensions: pluginsStart.workflowsExtensions,
                config,
              };

              const { workflowExecutionRepository, stepExecutionRepository } =
                this.createScopedRepositories();

              const interruptedOutcome = await resolveInterruptedWorkflowRunTask({
                workflowExecutionRepository,
                stepExecutionRepository,
                workflowRunId,
                spaceId,
                taskAttempts: taskInstance.attempts,
                logger,
              });

              if (interruptedOutcome.action === 'task_complete') {
                await handlePostExecutionLoop({
                  workflowRunId,
                  spaceId,
                  workflowExecutionRepository,
                  stepExecutionRepository,
                  internalResumeWorkflowExecution: this.internalResumeWorkflowExecutionHandler,
                  workflowTaskManager: new WorkflowTaskManager(pluginsStart.taskManager),
                  meteringService: this.meteringService,
                  cloudSetup: setupDependencies.cloudSetup,
                  logger,
                });
                const outcome = mapInterruptCompleteReasonToOutcome(
                  interruptedOutcome.reason,
                  interruptedOutcome.execution
                );
                if (outcome) {
                  stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
                    workflow_execution_id: workflowRunId,
                    workflow_id: interruptedOutcome.execution.workflowId,
                    space_id: spaceId,
                    outcome,
                  });
                }
                return;
              }

              try {
                const runResult = await runWorkflow({
                  workflowExecutionRepository,
                  stepExecutionRepository,
                  workflowRunId,
                  spaceId,
                  signal: taskAbortController.signal,
                  config,
                  logger,
                  fakeRequest,
                  dependencies,
                  workflowsExecutionEngine,
                  meteringService: this.meteringService,
                  internalResumeWorkflowExecution: this.internalResumeWorkflowExecutionHandler,
                });

                // Prefer cancelled when TM aborted the claim so a later stamp does not
                // overwrite cancel's semantic outcome (shared last-write-wins buffer).
                if (taskAbortController.signal.aborted) {
                  stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
                    workflow_execution_id: workflowRunId,
                    space_id: spaceId,
                    outcome: 'cancelled',
                  });
                  return;
                }

                const execution = await getExecutionForTaskRunEvent(
                  workflowExecutionRepository,
                  workflowRunId,
                  spaceId,
                  logger
                );

                if (runResult?.shouldDeleteTask) {
                  stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
                    workflow_execution_id: workflowRunId,
                    workflow_id: execution?.workflowId,
                    space_id: spaceId,
                    outcome: 'queued_deleted',
                  });
                  return {
                    state: {},
                    shouldDeleteTask: true,
                  };
                }

                if (execution) {
                  const outcome = mapExecutionStatusToOutcome(execution.status);
                  if (outcome) {
                    stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
                      workflow_execution_id: workflowRunId,
                      workflow_id: execution.workflowId,
                      space_id: spaceId,
                      outcome,
                    });
                  }
                }
              } catch (error) {
                const aborted = taskAbortController.signal.aborted;
                logWorkflowTaskFailure(logger, error, {
                  taskType: WORKFLOW_RUN_TASK_TYPE,
                  workflowRunId,
                  spaceId,
                  taskId: taskInstance.id,
                  attempt: taskInstance.attempts,
                  maxAttempts: WORKFLOW_RUN_TASK_MAX_ATTEMPTS,
                  aborted,
                });
                await resolveExhaustedWorkflowRunTask({
                  workflowExecutionRepository,
                  stepExecutionRepository,
                  workflowRunId,
                  spaceId,
                  taskAttempts: taskInstance.attempts,
                  maxAttempts: WORKFLOW_RUN_TASK_MAX_ATTEMPTS,
                  error,
                  logger,
                });
                if (aborted) {
                  stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
                    workflow_execution_id: workflowRunId,
                    space_id: spaceId,
                    outcome: 'cancelled',
                  });
                  throw error;
                }
                const execution = await getExecutionForTaskRunEvent(
                  workflowExecutionRepository,
                  workflowRunId,
                  spaceId,
                  logger
                );
                const isExhausted = taskInstance.attempts >= WORKFLOW_RUN_TASK_MAX_ATTEMPTS;
                stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
                  workflow_execution_id: workflowRunId,
                  workflow_id: execution?.workflowId,
                  space_id: spaceId,
                  outcome: isExhausted ? 'interrupted' : 'failed',
                });
                throw error;
              }
            },
            cancel: async () => {
              // TM logs task-cancel before invoking this handler; this stamp feeds the
              // shared buffer for a subsequent task-run log if run() finishes after abort.
              stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
                workflow_execution_id: workflowRunId,
                space_id: spaceId,
                outcome: 'cancelled',
              });
              taskAbortController.abort();
            },
          };
        },
      },
    });
    plugins.taskManager.registerTaskDefinitions({
      [WORKFLOW_RESUME_TASK_TYPE]: {
        paramsSchema: schema.object({
          workflowRunId: schema.string(),
          spaceId: schema.string(),
        }),
        title: 'Resume Workflow',
        description: 'Resumes a paused workflow',
        allowPriorityOverride: true,
        // Set high timeout for long-running workflows.
        // This is high value to allow long-running workflows.
        // The workflow timeout logic defined in workflow execution engine logic is the primary control.
        timeout: '365d',
        // Retries allow `resolveInterruptedWorkflowResumeTask` to fail-fast abandoned executions after interrupt.
        maxAttempts: WORKFLOW_RESUME_TASK_MAX_ATTEMPTS,
        createTaskRunner: ({ taskInstance, fakeRequest, signal, setCustomTaskRunEventFields }) => {
          const { workflowRunId, spaceId } = taskInstance.params as ResumeWorkflowExecutionParams;
          if (!fakeRequest) {
            return this.createMissingIdentityTaskRunner({
              workflowRunId,
              spaceId,
              setCustomTaskRunEventFields,
            });
          }
          const taskAbortController = createWorkflowTaskAbortController(signal);
          return {
            run: async () => {
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

              const dependencies: ContextDependencies = {
                ...setupDependencies,
                coreStart,
                actions: pluginsStart.actions,
                taskManager: pluginsStart.taskManager,
                workflowsExtensions: pluginsStart.workflowsExtensions,
                config,
              };

              const { workflowExecutionRepository, stepExecutionRepository } =
                this.createScopedRepositories();

              if (taskInstance.id !== getWorkflowWakeTaskId(workflowRunId)) {
                await new WorkflowTaskManager(pluginsStart.taskManager).ensureWakeTask({
                  executionId: workflowRunId,
                  spaceId,
                  fakeRequest,
                  runAt: new Date(Date.now() + WORKFLOW_WAKE_POLL_INTERVAL_MS),
                });
              }

              if (taskInstance.id !== getWorkflowImmediateResumeTaskId(workflowRunId)) {
                const retainedWake = taskInstance.id === getWorkflowWakeTaskId(workflowRunId);
                let isUserInteractive = false;
                if (retainedWake) {
                  const execution = await workflowExecutionRepository.getWorkflowExecutionById(
                    workflowRunId,
                    spaceId
                  );
                  if (!execution || isTerminalStatus(execution.status)) {
                    await new WorkflowTaskManager(pluginsStart.taskManager).removeTasksForExecution(
                      workflowRunId,
                      { exceptTaskId: taskInstance.id }
                    );
                    return;
                  }
                  isUserInteractive =
                    execution.context?.pendingInteractiveResume === true &&
                    execution.context?.resumeInput != null;
                }
                const accepted = await new WorkflowTaskManager(
                  pluginsStart.taskManager
                ).tryRunImmediateResume({
                  executionId: workflowRunId,
                  spaceId,
                  fakeRequest,
                  isUserInteractive,
                });
                // A request never loads workflow checkpoints or invokes steps. Busy
                // runners keep their claim; this notification retries durably in TM.
                if (retainedWake) {
                  // Retention closes the ensure-vs-delete race, including approvals written mid-claim.
                  return {
                    runAt: new Date(
                      Date.now() + (accepted ? WORKFLOW_WAKE_POLL_INTERVAL_MS : 1000)
                    ),
                    state: {},
                    priority: getTaskPriority({ isUserInteractive }),
                  };
                }
                return accepted ? undefined : { runAt: new Date(Date.now() + 1000), state: {} };
              }

              const currentExecution = await workflowExecutionRepository.getWorkflowExecutionById(
                workflowRunId,
                spaceId
              );
              if (
                currentExecution?.status === ExecutionStatus.RUNNING &&
                taskInstance.attempts === 1
              ) {
                // The initial run can still be executing (including short in-process
                // waits). Do not load its mutable checkpoint in a second runner.
                return { runAt: new Date(Date.now() + 1000), state: {} };
              }

              const interruptedOutcome = await resolveInterruptedWorkflowResumeTask({
                workflowExecutionRepository,
                stepExecutionRepository,
                workflowRunId,
                spaceId,
                taskAttempts: taskInstance.attempts,
                logger,
              });

              if (interruptedOutcome.action === 'task_complete') {
                await handlePostExecutionLoop({
                  workflowRunId,
                  spaceId,
                  workflowExecutionRepository,
                  stepExecutionRepository,
                  internalResumeWorkflowExecution: this.internalResumeWorkflowExecutionHandler,
                  workflowTaskManager: new WorkflowTaskManager(pluginsStart.taskManager),
                  meteringService: this.meteringService,
                  cloudSetup: setupDependencies.cloudSetup,
                  logger,
                });
                const outcome = mapInterruptCompleteReasonToOutcome(
                  interruptedOutcome.reason,
                  interruptedOutcome.execution
                );
                if (outcome) {
                  stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
                    workflow_execution_id: workflowRunId,
                    workflow_id: interruptedOutcome.execution.workflowId,
                    space_id: spaceId,
                    outcome,
                  });
                }
                return;
              }

              try {
                const { retryAt } = await resumeWorkflow({
                  workflowExecutionRepository,
                  stepExecutionRepository,
                  workflowRunId,
                  spaceId,
                  signal: taskAbortController.signal,
                  config,
                  logger,
                  fakeRequest,
                  dependencies,
                  workflowsExecutionEngine,
                  meteringService: this.meteringService,
                  internalResumeWorkflowExecution: this.internalResumeWorkflowExecutionHandler,
                });

                if (retryAt) return { runAt: retryAt, state: {} };

                if (taskAbortController.signal.aborted) {
                  stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
                    workflow_execution_id: workflowRunId,
                    space_id: spaceId,
                    outcome: 'cancelled',
                  });
                  return;
                }

                const execution = await getExecutionForTaskRunEvent(
                  workflowExecutionRepository,
                  workflowRunId,
                  spaceId,
                  logger
                );
                if (execution) {
                  const outcome = mapExecutionStatusToOutcome(execution.status);
                  if (outcome) {
                    stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
                      workflow_execution_id: workflowRunId,
                      workflow_id: execution.workflowId,
                      space_id: spaceId,
                      outcome,
                    });
                  }
                }
                if (execution && !isTerminalStatus(execution.status)) {
                  // Recreating the runner on the next wake-up would grant a new API key.
                  return {
                    runAt: new Date(Date.now() + WORKFLOW_PARKED_RUNNER_DELAY_MS),
                    state: {},
                  };
                }
              } catch (error) {
                const aborted = taskAbortController.signal.aborted;
                logWorkflowTaskFailure(logger, error, {
                  taskType: WORKFLOW_RESUME_TASK_TYPE,
                  workflowRunId,
                  spaceId,
                  taskId: taskInstance.id,
                  attempt: taskInstance.attempts,
                  maxAttempts: WORKFLOW_RESUME_TASK_MAX_ATTEMPTS,
                  aborted,
                });
                await resolveExhaustedWorkflowRunTask({
                  workflowExecutionRepository,
                  stepExecutionRepository,
                  workflowRunId,
                  spaceId,
                  taskAttempts: taskInstance.attempts,
                  maxAttempts: WORKFLOW_RESUME_TASK_MAX_ATTEMPTS,
                  error,
                  logger,
                });
                if (aborted) {
                  stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
                    workflow_execution_id: workflowRunId,
                    space_id: spaceId,
                    outcome: 'cancelled',
                  });
                  throw error;
                }
                const execution = await getExecutionForTaskRunEvent(
                  workflowExecutionRepository,
                  workflowRunId,
                  spaceId,
                  logger
                );
                const isExhausted = taskInstance.attempts >= WORKFLOW_RESUME_TASK_MAX_ATTEMPTS;
                stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
                  workflow_execution_id: workflowRunId,
                  workflow_id: execution?.workflowId,
                  space_id: spaceId,
                  outcome: isExhausted ? 'interrupted' : 'failed',
                });
                throw error;
              }
            },
            cancel: async () => {
              // TM logs task-cancel before invoking this handler; this stamp feeds the
              // shared buffer for a subsequent task-run log if run() finishes after abort.
              stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
                workflow_execution_id: workflowRunId,
                space_id: spaceId,
                outcome: 'cancelled',
              });
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
        maxAttempts: WORKFLOW_SCHEDULED_TASK_MAX_ATTEMPTS,
        createTaskRunner: ({ taskInstance, fakeRequest, signal, setCustomTaskRunEventFields }) => {
          const { workflowId, spaceId } = taskInstance.params as {
            workflowId: string;
            spaceId: string;
            triggerType: string;
          };
          if (!fakeRequest) {
            this.logger.warn(
              `Cannot execute scheduled workflow ${workflowId} in space ${spaceId}: ${MISSING_EXECUTION_IDENTITY_MESSAGE}`
            );
            return {
              run: async () => {
                stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
                  workflow_id: workflowId,
                  space_id: spaceId,
                  outcome: 'failed',
                });
              },
              cancel: async () => {
                stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
                  workflow_id: workflowId,
                  space_id: spaceId,
                  outcome: 'cancelled',
                });
              },
            };
          }
          const taskAbortController = createWorkflowTaskAbortController(signal);
          return {
            run: async () => {
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
              const { workflowExecutionRepository, stepExecutionRepository } =
                this.createScopedRepositories();

              let workflowExecutionId: string | undefined;
              try {
                const workflow = await workflowRepository.getWorkflow(workflowId, spaceId, {
                  includeGlobal: true,
                });
                if (!workflow) {
                  // Keep this as error for a while to ensure that such message appears only once per workflow
                  logger.error(
                    `Workflow ${workflowId} not found in space ${spaceId}; removing orphaned scheduled task`
                  );
                  stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
                    workflow_id: workflowId,
                    space_id: spaceId,
                    outcome: 'queued_deleted',
                  });
                  return {
                    state: taskInstance.state,
                    shouldDeleteTask: true,
                  };
                }
                // Document `enabled` is the source of truth. Skip this tick instead of
                // shouldDeleteTask: TM delete is unversioned and uses the same deterministic
                // task id as re-enable, so deleting here can remove a just-rescheduled task.
                if (!workflow.enabled) {
                  logger.warn(
                    `Workflow ${workflowId} is disabled in space ${spaceId}; skipping leftover scheduled run`
                  );
                  stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
                    workflow_id: workflowId,
                    space_id: spaceId,
                    outcome: 'skipped',
                  });
                  return {
                    state: taskInstance.state,
                  };
                }
                if (
                  !(await hasWorkflowAccess(workflow, fakeRequest, coreStart, {
                    id: workflowId,
                    spaceId,
                  }))
                ) {
                  logger.warn(
                    `Skipping scheduled workflow ${workflow.id}: execution access was removed.`
                  );
                  return { state: taskInstance.state };
                }
                logger.debug(`Running scheduled workflow task for workflow ${workflow.id}`);

                // Overlap / recovery: always run so past-tick abandoned `pending` orphans are
                // reaped even on the first attempt of a new schedule interval. Defer in-flight
                // SKIPPED only when concurrency key+strategy will enforce collisions.
                const concurrency = workflow.definition?.settings?.concurrency;
                const deferInFlightDuplicatesToConcurrency = Boolean(
                  concurrency?.key?.trim() && concurrency?.strategy
                );
                const workflowTaskManager = new WorkflowTaskManager(pluginsStart.taskManager);
                const skipResult = await checkAndSkipIfExistingScheduledExecution(
                  workflow,
                  spaceId,
                  workflowExecutionRepository,
                  stepExecutionRepository,
                  taskInstance,
                  logger,
                  {
                    createSkippedForInFlightDuplicates: !deferInFlightDuplicatesToConcurrency,
                    hasActiveTaskForExecution: (executionId) =>
                      workflowTaskManager.hasActiveTaskForExecution(executionId),
                  }
                );
                if (skipResult.skipped) {
                  stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
                    workflow_execution_id: skipResult.workflowExecutionId,
                    workflow_id: workflowId,
                    space_id: spaceId,
                    outcome: 'skipped',
                  });
                  return;
                }

                // Check for RRule triggers and log details
                const scheduledTriggers =
                  workflow.definition?.triggers?.filter(
                    (trigger) => trigger.type === 'scheduled'
                  ) || [];
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

                const workflowExecution = buildWorkflowExecutionDocument({
                  workflow: toWorkflowExecutionEngineModel(workflow),
                  spaceId,
                  context: executionContext,
                  defaultTriggeredBy: 'scheduled',
                  authenticatedUser: executedBy,
                  now: workflowCreatedAt,
                  maxEventChainDepth: this.config.eventDriven.maxChainDepth,
                  getConcurrencyGroupKey: (execution) =>
                    this.getConcurrencyGroupKey(
                      execution,
                      workflow.definition?.settings,
                      coreStart,
                      dependencies
                    ),
                });

                workflowExecution.taskRunAt = taskInstance.runAt?.toISOString() ?? null;
                if (this.config.collectQueueMetrics) {
                  workflowExecution.queueMetrics = {
                    scheduledAt: taskInstance.scheduledAt?.toString(),
                    runAt: taskInstance.runAt?.toString(),
                    startedAt: new Date(now).toISOString(),
                    queueDelayMs,
                    scheduleDelayMs,
                  };
                }

                await maybeDrainConcurrencyQueueBeforeEnqueue({
                  workflowExecution,
                  workflowExecutionRepository,
                  workflowTaskManager,
                  logger,
                  failureLogLabel: 'Scheduled workflow concurrency queue drain failed',
                });

                // Use refresh: 'wait_for' to ensure the execution is immediately searchable
                // for deduplication checks by subsequent scheduled tasks
                await workflowExecutionRepository.createWorkflowExecution(workflowExecution, {
                  refresh: 'wait_for',
                });
                await ensureBoundExecutionAdmitted(
                  workflowExecution,
                  workflowRepository,
                  workflowExecutionRepository
                );
                workflowExecutionId = workflowExecution.id;

                if (workflowExecution.status === ExecutionStatus.FAILED) {
                  stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
                    workflow_execution_id: workflowExecution.id,
                    workflow_id: workflowId,
                    space_id: spaceId,
                    outcome: 'failed',
                  });
                  return;
                }

                // Check concurrency limits and apply collision strategy if needed
                const canProceed = await this.checkConcurrencyIfNeeded(workflowExecution);
                if (!canProceed) {
                  if (workflowExecution.id && workflowExecution.spaceId) {
                    await handleConcurrencyBlockedExecution({
                      workflowExecutionId: workflowExecution.id,
                      spaceId: workflowExecution.spaceId,
                      request: fakeRequest,
                      workflowExecutionRepository,
                      stepExecutionRepository,
                      workflowTaskManager,
                      internalResumeWorkflowExecution: this.internalResumeWorkflowExecutionHandler,
                      logger,
                    });
                    const blockedExecution = await getExecutionForTaskRunEvent(
                      workflowExecutionRepository,
                      workflowExecution.id,
                      workflowExecution.spaceId,
                      logger
                    );
                    if (blockedExecution?.status === ExecutionStatus.SKIPPED) {
                      stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
                        workflow_execution_id: workflowExecution.id,
                        workflow_id: workflowId,
                        space_id: spaceId,
                        outcome: 'skipped',
                      });
                    }
                    // QUEUED handoff is non-terminal for the workflow — do not stamp.
                  }
                  return;
                }

                if (!workflowExecution.id || !workflowExecution.spaceId) {
                  stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
                    workflow_id: workflowId,
                    space_id: spaceId,
                    outcome: 'failed',
                  });
                  throw new Error('Workflow execution must have id and spaceId');
                }

                const [, , workflowsExecutionEngine] = await core.getStartServices();

                // Create-then-fail: scheduled runs start inline (no bound workflow:run). If
                // runWorkflow throws after create, terminalize the still-non-terminal doc so a
                // pending cannot hold a concurrency slot until a later tick reaps it.
                try {
                  await runWorkflow({
                    workflowRunId: workflowExecution.id,
                    spaceId: workflowExecution.spaceId,
                    signal: taskAbortController.signal,
                    logger,
                    config,
                    fakeRequest,
                    dependencies,
                    workflowsExecutionEngine,
                    meteringService: this.meteringService,
                    internalResumeWorkflowExecution: this.internalResumeWorkflowExecutionHandler,
                    workflowExecutionRepository,
                    stepExecutionRepository,
                  });
                } catch (error) {
                  await markScheduledExecutionFailedAfterTaskError({
                    workflowExecutionRepository,
                    stepExecutionRepository,
                    workflowRunId: workflowExecution.id,
                    spaceId: workflowExecution.spaceId,
                    logger,
                  });
                  throw error;
                }

                // Prefer cancelled when TM aborted the claim so a later stamp does not
                // overwrite cancel's semantic outcome (shared last-write-wins buffer).
                if (taskAbortController.signal.aborted) {
                  stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
                    workflow_execution_id: workflowExecution.id,
                    workflow_id: workflowId,
                    space_id: spaceId,
                    outcome: 'cancelled',
                  });
                  return;
                }

                const execution = await getExecutionForTaskRunEvent(
                  workflowExecutionRepository,
                  workflowExecution.id,
                  workflowExecution.spaceId,
                  logger
                );
                if (execution) {
                  const outcome = mapExecutionStatusToOutcome(execution.status);
                  if (outcome) {
                    stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
                      workflow_execution_id: workflowExecution.id,
                      workflow_id: workflowId,
                      space_id: spaceId,
                      outcome,
                    });
                  }
                }

                const scheduleType = rruleTriggers.length > 0 ? 'RRule' : 'interval/cron';
                logger.debug(
                  `Successfully executed ${scheduleType}-scheduled workflow ${workflow.id}`
                );
              } catch (error) {
                const aborted = taskAbortController.signal.aborted;
                logWorkflowTaskFailure(logger, error, {
                  taskType: WORKFLOW_SCHEDULED_TASK_TYPE,
                  workflowId,
                  workflowRunId: workflowExecutionId,
                  spaceId,
                  taskId: taskInstance.id,
                  attempt: taskInstance.attempts,
                  maxAttempts: WORKFLOW_SCHEDULED_TASK_MAX_ATTEMPTS,
                  aborted,
                });
                if (aborted) {
                  stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
                    workflow_execution_id: workflowExecutionId,
                    workflow_id: workflowId,
                    space_id: spaceId,
                    outcome: 'cancelled',
                  });
                  throw error;
                }
                stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
                  workflow_execution_id: workflowExecutionId,
                  workflow_id: workflowId,
                  space_id: spaceId,
                  outcome: 'failed',
                });
                throw error;
              }
            },
            async cancel() {
              // TM logs task-cancel before invoking this handler; workflow_execution_id is
              // omitted here (only known after create inside run()).
              stampWorkflowTaskRunEventFields(setCustomTaskRunEventFields, {
                workflow_id: workflowId,
                space_id: spaceId,
                outcome: 'cancelled',
              });
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

    void this.dataClientBundle.initStart(coreStart);

    const esClient = coreStart.elasticsearch.client.asInternalUser;
    void ensureWorkflowsDataStreamsRolledOver(this.logger.get('data-stream-rollover'), esClient);

    // Initialize ConcurrencyManager with dependencies
    const workflowTaskManager = new WorkflowTaskManager(plugins.taskManager);
    const { workflowExecutionRepository, stepExecutionRepository } =
      this.createScopedRepositories();
    const workflowRepository = new WorkflowRepository({ esClient, logger: this.logger });
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
      config: this.config,
    };

    const schedulingDeps: SchedulingDeps = {
      coreStart,
      licensing: plugins.licensing,
      taskManager: plugins.taskManager,
      cloudSetup: this.setupDependencies.cloudSetup,
      config: this.config,
      logger: this.logger,
      workflowRepository,
      workflowExecutionRepository,
      stepExecutionRepository,
      workflowTaskManager,
      concurrencyManager: this.concurrencyManager,
      getInternalResumeWorkflowExecution: () => this.internalResumeWorkflowExecutionHandler,
    };
    const helpers = createSchedulingHelpers(schedulingDeps, {
      checkConcurrencyIfNeeded: (workflowExecution) =>
        this.checkConcurrencyIfNeeded(workflowExecution),
    });
    const {
      ensureWorkflowEnabled,
      buildExecutionDocument,
      createAndPersistWorkflowExecution,
      createTaskInstance,
      scheduleDeps,
    } = helpers;

    const executeWorkflow: ExecuteWorkflow = async (workflow, context, originalRequest) => {
      const request = getWorkflowOriginalRequest(originalRequest);
      await checkLicense(plugins.licensing);

      // AUTO-DETECT: Check if we're already running in a Task Manager context
      const isRunningInTaskManager =
        (context.triggeredBy as string | undefined) === 'scheduled' ||
        (context.source as string | undefined) === 'task-manager' ||
        request?.isFakeRequest === true;

      // Child executions (triggered by a workflow step) must always be scheduled in their own task,
      // never run inline in the parent's task. Otherwise the parent's runtime is blocked until the
      // child becomes idle, and cancel/timeout on the parent cannot take effect until then.
      const isChildExecution = isWorkflowStepTriggered(context.triggeredBy as string | undefined);

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
        originalRequest,
        { refresh: true }
      );

      if (workflowExecution.status === ExecutionStatus.FAILED) {
        return {
          workflowExecutionId: workflowExecution.id,
        };
      }

      const inputsValid = await validateWorkflowInputs(
        workflowExecution,
        workflowExecutionRepository,
        this.logger,
        coreStart,
        dependencies
      );
      if (!inputsValid) {
        return {
          workflowExecutionId: workflowExecution.id,
        };
      }

      // Check concurrency limits and apply collision strategy if needed
      const canProceed = await this.checkConcurrencyIfNeeded(workflowExecution);
      if (!canProceed) {
        if (workflowExecution.id && workflowExecution.spaceId) {
          await handleConcurrencyBlockedExecution({
            workflowExecutionId: workflowExecution.id,
            spaceId: workflowExecution.spaceId,
            request,
            workflowExecutionRepository,
            stepExecutionRepository,
            workflowTaskManager,
            internalResumeWorkflowExecution: this.internalResumeWorkflowExecutionHandler,
            logger: this.logger,
          });
        }
        return {
          workflowExecutionId: workflowExecution.id,
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

        await runWorkflow({
          workflowExecutionRepository,
          stepExecutionRepository,
          workflowRunId: workflowExecution.id,
          spaceId: workflowExecution.spaceId,
          signal: new AbortController().signal, // TODO: We need to think how to pass this properly from outer task
          logger: this.logger,
          config: this.config,
          fakeRequest: request,
          dependencies,
          workflowsExecutionEngine,
          meteringService: this.meteringService,
          internalResumeWorkflowExecution: this.internalResumeWorkflowExecutionHandler,
        });
      } else {
        // Schedule a task: either we're not in a task, or this is a child execution (must not run inline)
        const taskInstance = createTaskInstance(workflowExecution, ['workflows']);
        await scheduleRunTaskOrMarkFailed(scheduleDeps, taskInstance, request as KibanaRequest);
        this.logger.debug(
          `Scheduling workflow task for workflow ${workflow.id}, execution ${workflowExecution.id}${
            isChildExecution ? ' (child execution)' : ''
          }`
        );
      }

      return {
        workflowExecutionId: workflowExecution.id,
      };
    };

    const scheduleWorkflow: ScheduleWorkflow = createScheduleWorkflow(schedulingDeps, helpers);
    const bulkScheduleWorkflow = createBulkScheduleWorkflow(schedulingDeps, helpers);

    const executeWorkflowStep: ExecuteWorkflowStep = async (
      workflow,
      stepId,
      executionContext,
      contextOverride,
      request
    ) => {
      await checkLicense(plugins.licensing);
      if (workflow.definition?.settings?.run_as) {
        throw Boom.badRequest(
          'Service-account step tests could bypass the saved workflow control flow. Run the complete latest saved workflow instead.'
        );
      }

      const spaceId = workflow.spaceId || 'default';
      await ensureWorkflowEnabled(workflow, spaceId);
      const context: Record<string, unknown> = {
        ...(executionContext ?? {}),
        contextOverride,
        isUserInteractive: true,
      };

      const executedBy = await getAuthenticatedUser(
        request,
        coreStart.security,
        coreStart.elasticsearch.client
      );
      const workflowExecution = await buildExecutionDocument({
        workflow,
        spaceId,
        context,
        defaultTriggeredBy: 'manual',
        authenticatedUser: executedBy,
        now: new Date(),
      });
      workflowExecution.stepId = stepId;

      await workflowExecutionRepository.createWorkflowExecution(workflowExecution);

      if (workflowExecution.status === ExecutionStatus.FAILED) {
        return {
          workflowExecutionId: workflowExecution.id as string,
        };
      }

      const taskInstance = createTaskInstance(
        workflowExecution,
        generateExecutionTaskScope(workflowExecution as EsWorkflowExecution)
      );

      // Use Task Manager's first-class API key support by passing the request.
      // Clone so org/global UIAM keys are granted as TM-managed internal keys.
      // At this point, request is guaranteed to exist due to the early check above
      this.logger.debug(
        `Scheduling workflow step task with user context for workflow ${workflow.id}, step ${stepId}`
      );
      await scheduleRunTaskOrMarkFailed(scheduleDeps, taskInstance, request);

      return {
        workflowExecutionId: workflowExecution.id as string,
      };
    };

    const cancelWorkflowExecution: CancelWorkflowExecution = async (
      workflowExecutionId,
      spaceId,
      schedulingRequest
    ) => {
      await checkLicense(plugins.licensing);

      await cancelWorkflow({
        workflowExecutionId,
        spaceId,
        schedulingRequest,
        workflowExecutionRepository,
        workflowTaskManager,
        logger: this.logger,
      });
    };

    const cancelAllActiveWorkflowExecutions: CancelAllActiveWorkflowExecutions = async ({
      spaceId,
      workflowId,
      schedulingRequest,
      onCancelled,
    }) => {
      await checkLicense(plugins.licensing);

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
          page.results.map((id) => cancelWorkflowExecution(id, spaceId, schedulingRequest))
        );

        outcomes.forEach((outcome, index) => {
          const executionId = page.results[index];
          if (outcome.status === 'fulfilled') {
            onCancelled?.(executionId);
            return;
          }
          const message =
            outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
          this.logger.warn(
            `cancelAllActiveWorkflowExecutions: failed to cancel execution ${executionId}: ${message}`
          );
        });

        searchAfter = page.nextSearchAfter;
      } while (searchAfter !== undefined);
    };

    const resumeWorkflowExecution: ResumeWorkflowExecution = (
      executionId,
      spaceId,
      input,
      request,
      options
    ) =>
      resumeWaitingWorkflowExecution(
        {
          workflowExecutionRepository,
          workflowTaskManager,
          internalResumeWorkflowExecution,
          assertLicensed: () => checkLicense(plugins.licensing),
          resolveResumedBy: async (resumeRequest) =>
            resumeRequest
              ? (await getAuthenticatedUser(
                  resumeRequest,
                  coreStart.security,
                  coreStart.elasticsearch.client
                )) ?? UNKNOWN_EXECUTION_IDENTITY
              : UNKNOWN_EXECUTION_IDENTITY,
          logger: this.logger,
        },
        { executionId, spaceId, input, request, resumedBy: options?.resumedBy }
      );

    const internalResumeWorkflowExecution: InternalResumeWorkflowExecution = async (
      executionId,
      spaceId,
      context,
      request,
      options
    ) => {
      if (context) {
        await workflowExecutionRepository.updateWorkflowExecution({
          id: executionId,
          context,
        });
      }

      if (!request) {
        // External resume: wake the idle-timeout task created when entering WAITING_FOR_INPUT.
        // That task retains the workflow runner API key; ad-hoc tasks scheduled without a
        // request cannot be executed by workflow:resume (no fakeRequest at run time).
        await workflowTaskManager.runExistingResumeTask(executionId);
        return;
      }

      // Preserve the immediate runner's claim and durably retry wake-ups that
      // arrive while it is active.
      await workflowTaskManager.scheduleAndRunImmediateResume({
        executionId,
        spaceId,
        fakeRequest: request,
        isUserInteractive: options?.isUserInteractive,
        // Only a person's approval replaces the parked key. Wake and timer polls
        // resume this task without the flag and keep the stored key.
        regenerateApiKey: options?.isUserInteractive === true,
      });
    };

    this.internalResumeWorkflowExecutionHandler = internalResumeWorkflowExecution;

    const logsRepository = new LogsRepository(coreStart.dataStreams, this.logger);
    const workflowEventLoggerService = new WorkflowLogsQueryService(logsRepository, this.logger);

    const triggerEventsClientPromise = initializeTriggerEventsClient(coreStart.dataStreams);

    const triggerEventHandler = new TriggerEventHandler({
      workflowExecutionRepository,
      coreStart,
      workflowRepository,
      workflowsExtensions: plugins.workflowsExtensions,
      spaces: plugins.spaces?.spacesService,
      scheduleWorkflow,
      logger: this.logger,
      config: this.config.eventDriven,
      triggerEventsClientPromise,
    });

    const triggerEvents: TriggerEventsContract = {
      emitEvent: (params) => triggerEventHandler.handleEvent(params),
      isEnabled: this.config.eventDriven.enabled,
      isLogEventsEnabled: this.config.eventDriven.logEvents,
      maxEventChainDepth: this.config.eventDriven.maxChainDepth,
      searchTriggerEventLog: async (params) => {
        const triggerEventsClient = await triggerEventsClientPromise;
        return querySearchTriggerEventLog(triggerEventsClient, params);
      },
    };

    return {
      workflowEventLoggerService,
      executeWorkflow,
      executeWorkflowStep,
      scheduleWorkflow,
      bulkScheduleWorkflow,
      cancelWorkflowExecution,
      cancelAllActiveWorkflowExecutions,
      resumeWorkflowExecution,
      triggerEvents,
      serviceAccountBindings: coreStart.security.serviceAccounts,
      __internalStorage: {
        workflowExecutionsDataClient: this.dataClientBundle.createWorkflowDataClient(),
        stepExecutionsDataClient: this.dataClientBundle.createStepDataClient(),
      },
    };
  }

  public stop() {
    void this.dataClientBundle.stop();
  }

  /**
   * Reused local wrapper for evaluating the concurrency group key for a workflow execution.
   * See `getConcurrencyGroupKey` in `./scheduling`.
   */
  private getConcurrencyGroupKey(
    workflowExecution: Partial<EsWorkflowExecution>,
    workflowSettings: WorkflowSettings | undefined,
    coreStart: CoreStart,
    dependencies: ContextDependencies
  ): string | null {
    return getConcurrencyGroupKey(
      { concurrencyManager: this.concurrencyManager, logger: this.logger },
      workflowExecution,
      workflowSettings,
      coreStart,
      dependencies
    );
  }

  /**
   * Checks concurrency limits and applies collision strategy if needed.
   * See `checkConcurrencyIfNeeded` in `./scheduling`.
   */
  private async checkConcurrencyIfNeeded(
    workflowExecution: Partial<EsWorkflowExecution>
  ): Promise<boolean> {
    return checkConcurrencyIfNeeded(
      { concurrencyManager: this.concurrencyManager, logger: this.logger },
      workflowExecution
    );
  }
}
