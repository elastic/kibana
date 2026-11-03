/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/core/server';
import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import {
  ExecutionStatus,
  isTerminalStatus,
  toWorkflowExecutionEngineModel,
  WorkflowRepository,
} from '@kbn/workflows';
import type { EsWorkflowExecution, WorkflowSettings } from '@kbn/workflows';
import { maybeDrainConcurrencyQueueBeforeEnqueue } from '../concurrency/concurrency_queue_drainer';
import { handleConcurrencyBlockedExecution } from '../concurrency/maybe_schedule_dormant_queued_run';
import type { WorkflowsExecutionEngineConfig } from '../config';
import {
  checkAndSkipIfExistingScheduledExecution,
  resumeWorkflow,
  runWorkflow,
} from '../execution_functions';
import { handlePostExecutionLoop } from '../execution_functions/handle_post_execution_loop';
import { buildWorkflowExecutionDocument } from '../lib/build_workflow_execution_document';
import { checkLicense } from '../lib/check_license';
import { ensureBoundExecutionAdmitted } from '../lib/ensure_bound_execution_admitted';
import { MISSING_EXECUTION_IDENTITY_MESSAGE } from '../lib/execution_identity';
import { getAuthenticatedUser } from '../lib/get_user';
import { hasWorkflowAccess } from '../lib/has_workflow_access';
import { logWorkflowTaskFailure } from '../lib/log_workflow_task_failure';
import {
  failExecutionMissingIdentity,
  markScheduledExecutionFailedAfterTaskError,
  resolveExhaustedWorkflowRunTask,
  resolveInterruptedWorkflowResumeTask,
  resolveInterruptedWorkflowRunTask,
} from '../lib/task_recovery';
import {
  getExecutionForTaskRunEvent,
  mapExecutionStatusToOutcome,
  mapInterruptCompleteReasonToOutcome,
  stampWorkflowTaskRunEventFields,
} from '../lib/workflow_task_run_event_fields';
import type { WorkflowsMeteringService } from '../metering/metering_service';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import type {
  InternalResumeWorkflowExecution,
  WorkflowsExecutionEnginePluginStart,
  WorkflowsExecutionEnginePluginStartDeps,
} from '../types';
import type { ContextDependencies } from '../workflow_context_manager/types';
import type {
  ResumeWorkflowExecutionParams,
  StartWorkflowExecutionParams,
} from '../workflow_task_manager/types';
import {
  WORKFLOW_RESUME_TASK_TYPE,
  WORKFLOW_RUN_TASK_TYPE,
  WORKFLOW_SCHEDULED_TASK_TYPE,
} from '../workflow_task_manager/types';
import {
  getTaskPriority,
  getWorkflowImmediateResumeTaskId,
  getWorkflowWakeTaskId,
  WORKFLOW_PARKED_RUNNER_DELAY_MS,
  WORKFLOW_WAKE_POLL_INTERVAL_MS,
  WorkflowTaskManager,
} from '../workflow_task_manager/workflow_task_manager';
import { createWorkflowTaskAbortController } from '../workflow_task_shutdown';

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

/**
 * What the workflow task runners need, explicit so Kibana's plugin and a task pod's tasks entry can
 * both build it: the services come from `getStartServices` (resolved when a task runs, after start)
 * rather than from a plugin class.
 */
export interface WorkflowTaskRunnerDeps {
  logger: Logger;
  config: WorkflowsExecutionEngineConfig;
  registerTaskDefinitions: (definitions: TaskDefinitionRegistry) => void;
  getStartServices: () => Promise<
    [
      ContextDependencies['coreStart'],
      Pick<
        WorkflowsExecutionEnginePluginStartDeps,
        'licensing' | 'actions' | 'taskManager' | 'workflowsExtensions'
      >,
      WorkflowsExecutionEnginePluginStart
    ]
  >;
  setupDependencies: Pick<ContextDependencies, 'cloudSetup'>;
  meteringService?: WorkflowsMeteringService;
  createScopedRepositories: () => {
    workflowExecutionRepository: WorkflowExecutionRepository;
    stepExecutionRepository: StepExecutionRepository;
  };
  /** Set at start; lets run and resume pass parent-resume without exposing it on the public contract. */
  getInternalResumeWorkflowExecution: () => InternalResumeWorkflowExecution | undefined;
  getConcurrencyGroupKey: (
    workflowExecution: Partial<EsWorkflowExecution>,
    workflowSettings: WorkflowSettings | undefined,
    coreStart: ContextDependencies['coreStart'],
    dependencies: ContextDependencies
  ) => string | null;
  checkConcurrencyIfNeeded: (workflowExecution: Partial<EsWorkflowExecution>) => Promise<boolean>;
}

/**
 * Completes a claimed `workflow:run` / `workflow:resume` task that has no
 * Task Manager identity by failing the persisted execution instead of leaving
 * it pending.
 */
const createMissingIdentityTaskRunner = (
  deps: Pick<WorkflowTaskRunnerDeps, 'logger' | 'createScopedRepositories'>,
  {
    workflowRunId,
    spaceId,
    setCustomTaskRunEventFields,
  }: {
    workflowRunId: string;
    spaceId: string;
    setCustomTaskRunEventFields: (fields: Record<string, unknown>) => void;
  }
): { run: () => Promise<void>; cancel: () => Promise<void> } => ({
  run: async () => {
    const { workflowExecutionRepository, stepExecutionRepository } =
      deps.createScopedRepositories();
    await failExecutionMissingIdentity({
      workflowExecutionRepository,
      stepExecutionRepository,
      workflowRunId,
      spaceId,
      logger: deps.logger,
    });
    const execution = await getExecutionForTaskRunEvent(
      workflowExecutionRepository,
      workflowRunId,
      spaceId,
      deps.logger
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
});

/** Registers the `workflow:run`, `workflow:resume` and `workflow:scheduled` task types. */
export const registerWorkflowTaskDefinitions = (deps: WorkflowTaskRunnerDeps) => {
  const { logger, config, setupDependencies } = deps;

  deps.registerTaskDefinitions({
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
          return createMissingIdentityTaskRunner(deps, {
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
                currentTransaction.setLabel('queue_delay_seconds', Math.round(queueDelayMs / 1000));
              }
              currentTransaction.setLabel('workflow_run_id', workflowRunId);
              currentTransaction.setLabel('space_id', spaceId);
            }

            const [coreStart, pluginsStart, workflowsExecutionEngine] =
              await deps.getStartServices();
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
              deps.createScopedRepositories();

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
                internalResumeWorkflowExecution: deps.getInternalResumeWorkflowExecution(),
                workflowTaskManager: new WorkflowTaskManager(pluginsStart.taskManager),
                meteringService: deps.meteringService,
                cloudSetup: deps.setupDependencies.cloudSetup,
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
                meteringService: deps.meteringService,
                internalResumeWorkflowExecution: deps.getInternalResumeWorkflowExecution(),
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
  deps.registerTaskDefinitions({
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
          return createMissingIdentityTaskRunner(deps, {
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
                currentTransaction.setLabel('queue_delay_seconds', Math.round(queueDelayMs / 1000));
              }
              if (resumeDelayMs !== null) {
                currentTransaction.setLabel('resume_delay_ms', resumeDelayMs);
              }
              currentTransaction.setLabel('workflow_run_id', workflowRunId);
              currentTransaction.setLabel('space_id', spaceId);
            }

            const [coreStart, pluginsStart, workflowsExecutionEngine] =
              await deps.getStartServices();
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
              deps.createScopedRepositories();

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
                  runAt: new Date(Date.now() + (accepted ? WORKFLOW_WAKE_POLL_INTERVAL_MS : 1000)),
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
                internalResumeWorkflowExecution: deps.getInternalResumeWorkflowExecution(),
                workflowTaskManager: new WorkflowTaskManager(pluginsStart.taskManager),
                meteringService: deps.meteringService,
                cloudSetup: deps.setupDependencies.cloudSetup,
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
                meteringService: deps.meteringService,
                internalResumeWorkflowExecution: deps.getInternalResumeWorkflowExecution(),
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
  deps.registerTaskDefinitions({
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
          deps.logger.warn(
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
                currentTransaction.setLabel('queue_delay_seconds', Math.round(queueDelayMs / 1000));
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

            const [coreStart, pluginsStart] = await deps.getStartServices();
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
              deps.createScopedRepositories();

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

              const workflowExecution = buildWorkflowExecutionDocument({
                workflow: toWorkflowExecutionEngineModel(workflow),
                spaceId,
                context: executionContext,
                defaultTriggeredBy: 'scheduled',
                authenticatedUser: executedBy,
                now: workflowCreatedAt,
                maxEventChainDepth: deps.config.eventDriven.maxChainDepth,
                getConcurrencyGroupKey: (execution) =>
                  deps.getConcurrencyGroupKey(
                    execution,
                    workflow.definition?.settings,
                    coreStart,
                    dependencies
                  ),
              });

              workflowExecution.taskRunAt = taskInstance.runAt?.toISOString() ?? null;
              if (deps.config.collectQueueMetrics) {
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
              const canProceed = await deps.checkConcurrencyIfNeeded(workflowExecution);
              if (!canProceed) {
                if (workflowExecution.id && workflowExecution.spaceId) {
                  await handleConcurrencyBlockedExecution({
                    workflowExecutionId: workflowExecution.id,
                    spaceId: workflowExecution.spaceId,
                    request: fakeRequest,
                    workflowExecutionRepository,
                    stepExecutionRepository,
                    workflowTaskManager,
                    internalResumeWorkflowExecution: deps.getInternalResumeWorkflowExecution(),
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

              const [, , workflowsExecutionEngine] = await deps.getStartServices();

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
                  meteringService: deps.meteringService,
                  internalResumeWorkflowExecution: deps.getInternalResumeWorkflowExecution(),
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
};
