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
import { type TaskManagerStartContract, TaskStatus } from '@kbn/task-manager-plugin/server';
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
 * Using a deterministic id makes scheduleImmediateResume idempotent (removeIfExists + schedule)
 * so concurrent callers cannot create two resume tasks for the same execution.
 */
export const getWorkflowImmediateResumeTaskId = (workflowExecutionId: string): string =>
  `workflow-immediate-resume-${workflowExecutionId}`;

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

    try {
      const existing = await this.taskManager.get(taskId);
      if (existing.status === TaskStatus.Running || existing.status === TaskStatus.Claiming) {
        // External resume runs inside this task; rescheduling while it is active would
        // remove the in-flight task. The resume loop re-schedules after the run completes.
        return { taskId: existing.id };
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
        params: {
          workflowRunId: workflowExecution.id,
          spaceId: workflowExecution.spaceId,
        } satisfies ResumeWorkflowExecutionParams,
        state: {},
        runAt: resumeAt,
        scope: generateExecutionTaskScope(workflowExecution as EsWorkflowExecution),
      },
      { request: fakeRequest }
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
        params: {
          workflowRunId: workflowExecution.id,
          spaceId: workflowExecution.spaceId,
        } satisfies ResumeWorkflowExecutionParams,
        state: {},
        runAt: resumeAt,
        scope: generateExecutionTaskScope(workflowExecution as EsWorkflowExecution),
      },
      { request: fakeRequest }
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
      { request }
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

  /**
   * Schedules an immediate `workflow:resume` for the given execution using a stable,
   * deterministic task id. Calls `removeIfExists` before scheduling so concurrent
   * callers cannot create two resume tasks for the same execution: the last writer wins
   * and there is always exactly one immediate-resume task outstanding per execution.
   */
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

    await this.taskManager.removeIfExists(taskId);

    const task = await this.taskManager.schedule(
      {
        id: taskId,
        taskType: WORKFLOW_RESUME_TASK_TYPE,
        params: {
          workflowRunId: executionId,
          spaceId,
        } satisfies ResumeWorkflowExecutionParams,
        state: {},
        scope: [`workflow:execution:${executionId}`],
      },
      fakeRequest ? { request: fakeRequest } : undefined
    );

    return {
      taskId: task.id,
    };
  }

  /**
   * Schedules an immediate `workflow:resume` and nudges Task Manager to claim it
   * right away via `runSoon`. Every call site that wants a deterministic, immediate
   * parent resume should use this instead of calling `scheduleImmediateResume` +
   * `runSoon` separately — keeping them together prevents callers from forgetting the nudge.
   */
  async scheduleAndRunImmediateResume({
    executionId,
    spaceId,
    fakeRequest,
  }: {
    executionId: string;
    spaceId: string;
    fakeRequest?: KibanaRequest;
  }): Promise<void> {
    const { taskId } = await this.scheduleImmediateResume({ executionId, spaceId, fakeRequest });
    await this.taskManager.runSoon(taskId);
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
