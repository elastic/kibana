/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution, StackFrame } from '@kbn/workflows';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import type { GraphNodeUnion } from '@kbn/workflows/graph';
import { isEnterStepTimeoutZone } from '@kbn/workflows/graph';
import type { WorkflowExecutionLoopParams } from './types';
import {
  getHitlIdleDeadlineMsForNode,
  getHitlIdleDeadlineMsForStep,
} from '../step/wait_for_input_step/hitl_timeout_helpers';
import { abortableTimeout, parseDuration, TimeoutAbortedError } from '../utils';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';

const SHORT_DURATION_THRESHOLD = 1000 * 5; // 5 seconds

type IdleTimeoutHitlStep =
  | StepExecutionRuntime
  | { node: GraphNodeUnion; startedAt: string | undefined };

/** Returns the earliest deadline across the waiting step and its enclosing timeout scopes. */
export function getIdleTimeoutResumeDeadlineMs(
  params: Pick<WorkflowExecutionLoopParams, 'workflowExecutionGraph' | 'workflowExecutionState'>,
  workflowExecution: EsWorkflowExecution,
  scopeStackFrames: StackFrame[],
  hitlStep: IdleTimeoutHitlStep
): number | undefined {
  const deadlineMs: number[] = [];

  const hitlDeadlineMs =
    'stepExecution' in hitlStep
      ? getHitlIdleDeadlineMsForStep(hitlStep)
      : getHitlIdleDeadlineMsForNode(hitlStep.node, hitlStep.startedAt);
  if (hitlDeadlineMs !== undefined) {
    deadlineMs.push(hitlDeadlineMs);
  }

  const workflowTimeoutStr = params.workflowExecutionGraph.getWorkflowLevelTimeout();
  if (workflowTimeoutStr && workflowExecution.startedAt) {
    deadlineMs.push(
      new Date(workflowExecution.startedAt).getTime() + parseDuration(workflowTimeoutStr)
    );
  }

  for (const frame of scopeStackFrames) {
    for (const scope of frame.nestedScopes) {
      const graphNode = params.workflowExecutionGraph.getNode(scope.nodeId);
      if (graphNode && isEnterStepTimeoutZone(graphNode)) {
        const latest = params.workflowExecutionState.getLatestStepExecution(graphNode.stepId);
        if (latest?.startedAt) {
          deadlineMs.push(new Date(latest.startedAt).getTime() + parseDuration(graphNode.timeout));
        }
      }
    }
  }

  if (deadlineMs.length === 0) {
    return undefined;
  }

  return Math.min(...deadlineMs);
}

async function scheduleWorkflowGlobalTimeoutResumeTask(
  params: WorkflowExecutionLoopParams,
  workflowExecution: EsWorkflowExecution,
  hitlStep: IdleTimeoutHitlStep
): Promise<{ taskId: string } | undefined> {
  const deadlineMs = getIdleTimeoutResumeDeadlineMs(
    params,
    workflowExecution,
    params.workflowExecutionCursor.currentStackFrames,
    hitlStep
  );
  if (deadlineMs === undefined) {
    return undefined;
  }

  const resumeAtMs = Math.max(deadlineMs, new Date().getTime() + 500);

  try {
    return await params.workflowTaskManager.scheduleWorkflowGlobalTimeoutResumeTask({
      workflowExecution: workflowExecution as EsWorkflowExecution,
      resumeAt: new Date(resumeAtMs),
      fakeRequest: params.fakeRequest,
    });
  } catch (error: unknown) {
    params.workflowLogger.logWarn(
      `Failed to schedule idle-timeout resume (execution=${workflowExecution.id}): ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return undefined;
  }
}

/**
 * Lost-wakeup handshake: after the parent's authenticated resume task is armed,
 * re-read the sync child. If it already finished during arming, pull the task's
 * runAt to now so the parent does not sit until the workflow-level timeout.
 */
async function wakeIfSyncChildAlreadyTerminal(
  params: WorkflowExecutionLoopParams,
  childExecutionId: unknown
): Promise<void> {
  if (typeof childExecutionId !== 'string' || childExecutionId.length === 0) {
    return;
  }

  const parentExecution = params.workflowRuntime.getWorkflowExecution();
  const spaceId = parentExecution.spaceId;
  if (!spaceId) {
    return;
  }

  try {
    const child = await params.workflowExecutionRepository.getWorkflowExecutionById(
      childExecutionId,
      spaceId
    );
    if (!child || !isTerminalStatus(child.status)) {
      return;
    }

    await params.workflowTaskManager.runExistingResumeTask(parentExecution.id);
  } catch (error: unknown) {
    params.workflowLogger.logWarn(
      `Failed to wake parent after detecting terminal sync child ` +
        `(parent=${parentExecution.id}, child=${childExecutionId}): ${
          error instanceof Error ? error.message : String(error)
        }`
    );
  }
}

/**
 * Computes the next idle-timeout `runAt` when a resume loop ends while the execution is
 * still waiting (HITL / sync child). Used to re-arm the stable global-timeout task.
 */
export function getWorkflowIdleTimeoutResumeAtAfterLoop(
  params: WorkflowExecutionLoopParams
): Date | undefined {
  const workflowExecution = params.workflowRuntime.getWorkflowExecution();
  if (
    workflowExecution.status !== ExecutionStatus.WAITING_FOR_INPUT &&
    workflowExecution.status !== ExecutionStatus.WAITING_FOR_CHILD
  ) {
    return undefined;
  }

  const node = params.workflowRuntime.getCurrentNode();
  if (!node?.stepId) {
    return undefined;
  }

  const stepExecution = params.workflowExecutionState.getLatestStepExecution(node.stepId);
  const deadlineMs = getIdleTimeoutResumeDeadlineMs(
    params,
    workflowExecution,
    params.workflowExecutionCursor.currentStackFrames,
    {
      node,
      startedAt: stepExecution?.startedAt,
    }
  );
  if (deadlineMs === undefined) {
    return undefined;
  }

  return new Date(Math.max(deadlineMs, Date.now() + 500));
}

/**
 * Re-schedules the idle-timeout resume task after a `workflow:resume` run when the
 * execution is still waiting. Used for one-shot resume tasks (not the global-timeout task).
 */
export async function ensureWorkflowIdleTimeoutResumeAfterLoop(
  params: WorkflowExecutionLoopParams
): Promise<void> {
  const resumeAt = getWorkflowIdleTimeoutResumeAtAfterLoop(params);
  if (resumeAt === undefined) {
    return;
  }

  const workflowExecution = params.workflowRuntime.getWorkflowExecution();
  const node = params.workflowRuntime.getCurrentNode();

  try {
    await params.workflowTaskManager.scheduleWorkflowGlobalTimeoutResumeTask({
      workflowExecution: workflowExecution as EsWorkflowExecution,
      resumeAt,
      fakeRequest: params.fakeRequest,
    });
  } catch (error: unknown) {
    params.workflowLogger.logWarn(
      `Failed to schedule idle-timeout resume (execution=${workflowExecution.id}): ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return;
  }

  if (workflowExecution.status === ExecutionStatus.WAITING_FOR_CHILD && node?.stepId) {
    const stepExecution = params.workflowExecutionState.getLatestStepExecution(node.stepId);
    await wakeIfSyncChildAlreadyTerminal(params, stepExecution?.state?.executionId);
  }
}

export async function handleExecutionDelay(
  params: WorkflowExecutionLoopParams,
  stepExecutionRuntime: StepExecutionRuntime
) {
  const workflowExecution = params.workflowRuntime.getWorkflowExecution();

  const stepStatus = stepExecutionRuntime.stepExecution?.status;
  if (
    stepStatus === ExecutionStatus.WAITING_FOR_INPUT ||
    stepStatus === ExecutionStatus.WAITING_FOR_CHILD
  ) {
    params.workflowExecutionState.updateWorkflowExecution({
      status: stepStatus,
    });

    const scheduled = await scheduleWorkflowGlobalTimeoutResumeTask(
      params,
      workflowExecution,
      stepExecutionRuntime
    );
    if (stepStatus === ExecutionStatus.WAITING_FOR_CHILD && scheduled) {
      await wakeIfSyncChildAlreadyTerminal(
        params,
        stepExecutionRuntime.stepExecution?.state?.executionId
      );
    }

    params.workflowExecutionCursor.stop();
    return;
  }

  if (
    !stepExecutionRuntime.stepExecution ||
    stepExecutionRuntime.stepExecution.status !== ExecutionStatus.WAITING
  ) {
    return;
  }
  const resumeAtFromState = stepExecutionRuntime.stepExecution.state?.resumeAt;
  // When set, skip in-process sleep for short delays and schedule a resume task so this task
  // is not held for the full wait (see enterWaitUntil forceTaskSchedule).
  const forceTaskScheduleFromState = stepExecutionRuntime.stepExecution.state?.forceTaskSchedule;

  if (typeof resumeAtFromState !== 'string') {
    return;
  }

  const resumeAt = new Date(resumeAtFromState);
  const now = new Date();
  const diff = resumeAt.getTime() - now.getTime();

  // In-process wait: keep workflow RUNNING. Persistence already flushes while
  // the cursor is executing; setting WAITING here races cancel/drop occupancy.
  if (!forceTaskScheduleFromState && diff < SHORT_DURATION_THRESHOLD) {
    const timeout = diff > 0 ? diff : 0;

    try {
      await abortableTimeout(timeout, stepExecutionRuntime.abortController.signal);
    } catch (error) {
      if (error instanceof TimeoutAbortedError) {
        // Delay was interrupted (e.g. by a timeout or cancellation).
        // Leave workflow status as-is: cancel/timeout monitors own CANCELLED / TIMED_OUT.
        return;
      }

      throw error;
    }
    return;
  }

  params.workflowExecutionState.updateWorkflowExecution({
    status: ExecutionStatus.WAITING,
  });
  await params.workflowTaskManager.scheduleResumeTask({
    workflowExecution: workflowExecution as EsWorkflowExecution,
    resumeAt,
    fakeRequest: params.fakeRequest,
  });
  // Execution loop should stop here so the workflow can be resumed later
  params.workflowExecutionCursor.stop();
}
