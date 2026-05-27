/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { flushState } from './persistence_loop';
import type { WorkflowExecutionLoopParams } from './types';
import { abortableTimeout, TimeoutAbortedError } from '../utils';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';

const SHORT_DURATION_THRESHOLD = 1000 * 5; // 5 seconds

export async function handleExecutionDelay(
  params: WorkflowExecutionLoopParams,
  stepExecutionRuntime: StepExecutionRuntime
) {
  const workflowExecution = params.workflowRuntime.getWorkflowExecution();

  if (stepExecutionRuntime.stepExecution?.status === ExecutionStatus.WAITING_FOR_INPUT) {
    // Propagate WAITING_FOR_INPUT to the workflow level so the execution loop exits.
    // Resumption is triggered externally by the resume API; no task is scheduled here.
    params.workflowExecutionState.updateWorkflowExecution({
      status: ExecutionStatus.WAITING_FOR_INPUT,
    });
    return;
  }

  if (
    !stepExecutionRuntime.stepExecution ||
    stepExecutionRuntime.stepExecution.status !== ExecutionStatus.WAITING
  ) {
    return;
  }
  const resumeAtFromState = stepExecutionRuntime.stepExecution.state?.resumeAt;

  if (typeof resumeAtFromState !== 'string') {
    return;
  }

  const resumeAt = new Date(resumeAtFromState);
  const now = new Date();
  const diff = resumeAt.getTime() - now.getTime();
  if (diff < SHORT_DURATION_THRESHOLD) {
    // Flush while workflow is still RUNNING so the persistence loop stays active and
    // cancellation is not racing a freshly-persisted WAITING workflow status.
    await flushState(params);
    params.workflowExecutionState.updateWorkflowExecution({
      status: ExecutionStatus.WAITING,
    });
    const timeout = diff > 0 ? diff : 0;

    try {
      await abortableTimeout(timeout, stepExecutionRuntime.abortController.signal);
    } catch (error) {
      if (error instanceof TimeoutAbortedError) {
        if (stepExecutionRuntime.abortController.signal.aborted) {
          return;
        }
        // Delay was interrupted for other reasons (e.g. on-failure continue).
        // Reset status to RUNNING so the execution loop can continue.
        params.workflowExecutionState.updateWorkflowExecution({
          status: ExecutionStatus.RUNNING,
        });
        return;
      }

      throw error;
    }
    params.workflowExecutionState.updateWorkflowExecution({
      status: ExecutionStatus.RUNNING,
    });
  } else {
    params.workflowExecutionState.updateWorkflowExecution({
      status: ExecutionStatus.WAITING,
    });
    await params.workflowTaskManager.scheduleResumeTask({
      workflowExecution,
      resumeAt,
      fakeRequest: params.fakeRequest,
    });
  }
}
