/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { buildStepExecutionId } from '../utils';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionCursorApi } from '../workflow_context_manager/workflow_execution_cursor';
import type { WorkflowExecutionState } from '../workflow_context_manager/workflow_execution_state';

/**
 * Reads in-memory execution state and, when cancelRequested is true, aborts the running step
 * and marks the current step and its scopes as cancelled.
 * Aborting the step's AbortController stops a step that supports cancellation (for example an HTTP step).
 */
export async function cancelWorkflowIfRequested(
  workflowExecutionState: WorkflowExecutionState,
  monitoredStepExecutionRuntime: StepExecutionRuntime,
  workflowExecutionCursor: WorkflowExecutionCursorApi,
  monitorAbortController?: AbortController
): Promise<void> {
  if (!workflowExecutionState.getWorkflowExecution().cancelRequested) {
    return;
  }

  monitorAbortController?.abort();
  monitoredStepExecutionRuntime.abortController.abort();
  let nodeStack = monitoredStepExecutionRuntime.scopeStack;

  // mark current step scopes as cancelled
  while (!nodeStack.isEmpty()) {
    const scopeData = nodeStack.getCurrentScope();
    nodeStack = nodeStack.exitScope();
    const stepExecutionId = buildStepExecutionId(
      workflowExecutionState.getWorkflowExecution().id,
      scopeData.stepId,
      nodeStack.stackFrames
    );

    if (workflowExecutionState.getStepExecution(stepExecutionId)) {
      workflowExecutionState.upsertStep({
        id: stepExecutionId,
        status: ExecutionStatus.CANCELLED,
      });
    }
  }

  workflowExecutionState.upsertStep({
    id: monitoredStepExecutionRuntime.stepExecutionId,
    status: ExecutionStatus.CANCELLED,
    stepId: monitoredStepExecutionRuntime.node.stepId,
    stepType: monitoredStepExecutionRuntime.node.stepType,
    scopeStack: monitoredStepExecutionRuntime.scopeStack.stackFrames,
  });
  workflowExecutionState.updateWorkflowExecution({
    status: ExecutionStatus.CANCELLED,
  });
  workflowExecutionCursor.stop();
}
