/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 } from 'uuid';
import { type KibanaRequest, SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  TaskAlreadyRunningError,
  type TaskManagerStartContract,
  TaskStatus,
} from '@kbn/task-manager-plugin/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { getWorkflowRunTaskId } from './get_workflow_run_task_id';
import { WORKFLOW_RESUME_TASK_TYPE, WORKFLOW_RUN_TASK_TYPE } from './types';
import type { ResumeWorkflowExecutionParams, StartWorkflowExecutionParams } from './types';
import { resolveQueueTtlMs } from '../concurrency/queue_concurrency_utils';
import { generateExecutionTaskScope } from '../utils';

export { getWorkflowRunTaskId } from './get_workflow_run_task_id';

/** Stable task id so idle-timeout (workflow + enclosing step) resumes dedupe per execution. */
export const getWorkflowGlobalTimeoutResumeTaskId = (workflowExecutionId: string): string =>
  `workflow-global-timeout-${workflowExecutionId}`;

/**
 * Stable task id / deduplication key for any immediate `workflow:resume` (no runAt).
 * Task Manager owns this document throughout the run; callers must never replace it.
 */
export const getWorkflowImmediateResumeTaskId = (workflowExecutionId: string): string =>
  `workflow-immediate-resume-${workflowExecutionId}`;

/** Stable authenticated wake-up retained until its workflow execution is terminal. */
export const getWorkflowWakeTaskId = (executionId: string): string =>
  `workflow-wake-${executionId}`;

export const WORKFLOW_WAKE_POLL_INTERVAL_MS = 30_000;

export class WorkflowTaskManager {
  constructor(private taskManager: TaskManagerStartContract) {}

  /**
   * Schedules or updates a single `workflow:resume` at the earliest idle deadline (HITL /
   * sync child). Skips TM writes when runAt and params already match.
   *
   * Uses `taskManager.get` once per schedule attempt to dedupe: callers invoke this when
   * entering `handleExecutionDelay` after a step completes (once per `runNode` pass while the
   * workflow is waiting), not in an inner hot loop over unchanged state.
   */
  async scheduleWorkflowGlobalTimeoutResumeTask({
    workflowExecution,
    resumeAt,
    fakeRequest,
  }: {
    workflowExecution: EsWorkflowExecution;
    resumeAt: Date;
    fakeRequest: KibanaRequest;
  }): Promise<{ taskId: string }> {
    const taskId = getWorkflowGlobalTimeoutResumeTaskId(workflowExecution.id);
    const desiredRunAtMs = resumeAt.getTime();
    await this.ensureWakeTask({
      executionId: workflowExecution.id,
      spaceId: workflowExecution.spaceId,
      fakeRequest,
      runAt: resumeAt,
    });

    try {
      const existing = await this.taskManager.get(taskId);
      if (existing.status === TaskStatus.Running || existing.status === TaskStatus.Claiming) {
        // Do not replace a claimed notification. Preserve the next deadline in
        // a separate notification if the current one has not finished dispatching.
        return this.scheduleResumeTask({ workflowExecution, resumeAt, fakeRequest });
      }

      if (existing.runAt != null) {
        const existingRunAtMs = new Date(existing.runAt).getTime();
        const params = existing.params as ResumeWorkflowExecutionParams | undefined;
        if (
          existing.taskType === WORKFLOW_RESUME_TASK_TYPE &&
          existingRunAtMs === desiredRunAtMs &&
          params?.workflowRunId === workflowExecution.id &&
          params?.spaceId === workflowExecution.spaceId
        ) {
          return { taskId: existing.id };
        }
      }
    } catch (err) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
        throw err;
      }
    }

    await this.taskManager.removeIfExists(taskId);

    const task = await this.taskManager.schedule(
      {
        id: taskId,
        taskType: WORKFLOW_RESUME_TASK_TYPE,
        timeoutOverride: '1m',
        params: {
          workflowRunId: workflowExecution.id,
          spaceId: workflowExecution.spaceId,
        } satisfies ResumeWorkflowExecutionParams,
        state: {},
        runAt: resumeAt,
        scope: generateExecutionTaskScope(workflowExecution as EsWorkflowExecution),
      },
      { request: fakeRequest, cloneApiKey: true }
    );

    return {
      taskId: task.id,
    };
  }

  async scheduleResumeTask({
    workflowExecution,
    resumeAt,
    fakeRequest,
  }: {
    workflowExecution: EsWorkflowExecution;
    resumeAt: Date;
    fakeRequest: KibanaRequest;
  }): Promise<{ taskId: string }> {
    const task = await this.taskManager.schedule(
      {
        id: v4(),
        taskType: WORKFLOW_RESUME_TASK_TYPE,
        timeoutOverride: '1m',
        params: {
          workflowRunId: workflowExecution.id,
          spaceId: workflowExecution.spaceId,
        } satisfies ResumeWorkflowExecutionParams,
        state: {},
        runAt: resumeAt,
        scope: generateExecutionTaskScope(workflowExecution as EsWorkflowExecution),
      },
      { request: fakeRequest, cloneApiKey: true }
    );

    return {
      taskId: task.id,
    };
  }

  /**
   * Schedules a dormant `workflow:run` for a queued execution using the trigger user's credentials.
   * The task runs at queue TTL unless promoted earlier via {@link promoteQueuedRunTask}.
   */
  async scheduleDormantQueuedRunTask({
    workflowExecution,
    request,
  }: {
    workflowExecution: EsWorkflowExecution;
    request: KibanaRequest;
  }): Promise<{ taskId: string }> {
    if (!workflowExecution.id || !workflowExecution.spaceId) {
      throw new Error('Workflow execution must have id and spaceId to schedule a queued run task');
    }

    const triggeredBy = workflowExecution.triggeredBy || 'manual';
    const taskId = getWorkflowRunTaskId(workflowExecution.id, triggeredBy);
    const runAt = new Date(
      Date.now() + resolveQueueTtlMs(workflowExecution.workflowDefinition?.settings?.concurrency)
    );

    await this.taskManager.removeIfExists(taskId);

    const task = await this.taskManager.schedule(
      {
        id: taskId,
        taskType: WORKFLOW_RUN_TASK_TYPE,
        params: {
          workflowRunId: workflowExecution.id,
          spaceId: workflowExecution.spaceId,
        } satisfies StartWorkflowExecutionParams,
        state: {
          lastRunAt: null,
          lastRunStatus: null,
          lastRunError: null,
        },
        runAt,
        scope: generateExecutionTaskScope(workflowExecution),
        enabled: true,
      },
      { request, cloneApiKey: true }
    );

    return { taskId: task.id };
  }

  async promoteQueuedRunTask({
    executionId,
    triggeredBy,
  }: {
    executionId: string;
    triggeredBy?: string;
  }): Promise<void> {
    await this.taskManager.runSoon(getWorkflowRunTaskId(executionId, triggeredBy || 'manual'));
  }

  /**
   * Returns true if Task Manager has at least one task for this execution scope that could still
   * run (idle, claiming, or running). Existence check only (`size: 1`).
   */
  async hasActiveTaskForExecution(workflowExecutionId: string): Promise<boolean> {
    const { docs } = await this.taskManager.fetch({
      size: 1,
      query: {
        bool: {
          filter: [
            {
              terms: {
                'task.status': [TaskStatus.Idle, TaskStatus.Claiming, TaskStatus.Running],
              },
            },
            {
              term: {
                'task.scope': `workflow:execution:${workflowExecutionId}`,
              },
            },
          ],
        },
      },
    });
    return docs.length > 0;
  }

  async removeQueuedRunTask({
    executionId,
    triggeredBy,
  }: {
    executionId: string;
    triggeredBy?: string;
  }): Promise<void> {
    await this.taskManager.removeIfExists(
      getWorkflowRunTaskId(executionId, triggeredBy || 'manual')
    );
  }

  /** Ensures the immediate runner exists without replacing an active Task Manager claim. */
  async scheduleImmediateResume({
    executionId,
    spaceId,
    fakeRequest,
  }: {
    executionId: string;
    spaceId: string;
    fakeRequest?: KibanaRequest;
  }): Promise<{ taskId: string }> {
    const taskId = getWorkflowImmediateResumeTaskId(executionId);
    await this.taskManager.ensureScheduled(
      {
        id: taskId,
        taskType: WORKFLOW_RESUME_TASK_TYPE,
        params: { workflowRunId: executionId, spaceId } satisfies ResumeWorkflowExecutionParams,
        state: {},
        scope: [`workflow:execution:${executionId}`],
      },
      fakeRequest ? { request: fakeRequest, cloneApiKey: true } : undefined
    );
    return { taskId };
  }

  /** Returns false when a wake-up must be retried after the current runner releases its claim. */
  async tryRunImmediateResume(params: {
    executionId: string;
    spaceId: string;
    fakeRequest?: KibanaRequest;
  }): Promise<boolean> {
    const { taskId } = await this.scheduleImmediateResume(params);
    try {
      const result = await this.taskManager.runSoon(taskId);
      return !result?.conflict;
    } catch (error) {
      // The task may complete between ensureScheduled and runSoon. Neither a busy
      // claim nor deletion at completion means the wake-up has been consumed.
      if (
        error instanceof TaskAlreadyRunningError ||
        SavedObjectsErrorHelpers.isNotFoundError(error)
      ) {
        return false;
      }
      throw error;
    }
  }

  /** Persists a retryable wake-up when the immediate runner is already claimed. */
  async scheduleAndRunImmediateResume(params: {
    executionId: string;
    spaceId: string;
    fakeRequest?: KibanaRequest;
  }): Promise<void> {
    if (await this.tryRunImmediateResume(params)) return;
    await this.ensureWakeTask(params);
    try {
      await this.runSoonWithConflictRetry(getWorkflowWakeTaskId(params.executionId));
    } catch (error) {
      // A claimed wake task is retained and polls again; it cannot delete this request on success.
      if (!(error instanceof TaskAlreadyRunningError)) throw error;
    }
  }

  /** Ensures a retained wake task with cloned execution credentials exists before handoff. */
  async ensureWakeTask(params: {
    executionId: string;
    spaceId: string;
    fakeRequest?: KibanaRequest;
    runAt?: Date;
  }): Promise<void> {
    await this.taskManager.ensureScheduled(
      {
        id: getWorkflowWakeTaskId(params.executionId),
        taskType: WORKFLOW_RESUME_TASK_TYPE,
        timeoutOverride: '1m',
        params: { workflowRunId: params.executionId, spaceId: params.spaceId },
        state: {},
        runAt: params.runAt ?? new Date(Date.now() + 1000),
        scope: [`workflow:execution:${params.executionId}`],
      },
      params.fakeRequest ? { request: params.fakeRequest, cloneApiKey: true } : undefined
    );
  }

  /** Wakes an existing authenticated timer without creating a task lacking execution credentials. */
  async runExistingResumeTask(executionId: string): Promise<void> {
    try {
      await this.runSoonWithConflictRetry(getWorkflowWakeTaskId(executionId));
      return;
    } catch (error) {
      if (error instanceof TaskAlreadyRunningError) return;
      if (!SavedObjectsErrorHelpers.isNotFoundError(error)) throw error;
    }
    // Older executions may only have the original authenticated timeout task.
    try {
      await this.runSoonWithConflictRetry(getWorkflowGlobalTimeoutResumeTaskId(executionId));
    } catch (error) {
      // Every claimed resume task installs the retained wake before it dispatches or exits.
      if (error instanceof TaskAlreadyRunningError) return;
      if (!SavedObjectsErrorHelpers.isNotFoundError(error)) throw error;
      // A claimed global notification can hand its next deadline to a separate
      // timer. That timer retains the identity needed for an external HITL resume.
      const { docs } = await this.taskManager.fetch({
        size: 1,
        query: {
          bool: {
            filter: [
              { term: { 'task.scope': `workflow:execution:${executionId}` } },
              { term: { 'task.taskType': WORKFLOW_RESUME_TASK_TYPE } },
              { term: { 'task.status': TaskStatus.Idle } },
            ],
          },
        },
      });
      if (!docs.length) throw error;
      try {
        await this.runSoonWithConflictRetry(docs[0].id);
      } catch (wakeError) {
        if (!(wakeError instanceof TaskAlreadyRunningError)) throw wakeError;
      }
    }
  }

  private async runSoonWithConflictRetry(taskId: string): Promise<void> {
    // Re-read after a conflicting update; never report a wake-up that was not accepted.
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await this.taskManager.runSoon(taskId);
      if (!result.conflict) return;
    }
    throw SavedObjectsErrorHelpers.createConflictError(
      'task',
      taskId,
      'Failed to wake resume task after conflicting updates'
    );
  }

  async forceRunIdleTasks(
    workflowExecutionId: string,
    options?: { spaceId: string; fakeRequest: KibanaRequest }
  ): Promise<void> {
    const scopeTerm = {
      term: {
        'task.scope': `workflow:execution:${workflowExecutionId}`,
      },
    };

    const { docs: idleTasks } = await this.taskManager.fetch({
      query: {
        bool: {
          must: [
            {
              term: {
                'task.status': TaskStatus.Idle,
              },
            },
            scopeTerm,
          ],
        },
      },
    });

    const idleTasksToRun = idleTasks.filter(
      (idleTask) => idleTask.id !== getWorkflowGlobalTimeoutResumeTaskId(workflowExecutionId)
    );

    if (idleTasksToRun.length) {
      // TODO: To use bulkRunSoon once available
      await Promise.all(idleTasksToRun.map((idleTask) => this.taskManager.runSoon(idleTask.id)));
      return;
    }

    const { docs: activeTasks } = await this.taskManager.fetch({
      query: {
        bool: {
          must: [
            scopeTerm,
            {
              terms: {
                'task.status': [TaskStatus.Running, TaskStatus.Claiming],
              },
            },
          ],
        },
      },
    });

    if (activeTasks.length) {
      return;
    }

    if (options?.spaceId) {
      await this.scheduleAndRunImmediateResume({
        executionId: workflowExecutionId,
        spaceId: options.spaceId,
        fakeRequest: options.fakeRequest,
      });
    }
  }
}
