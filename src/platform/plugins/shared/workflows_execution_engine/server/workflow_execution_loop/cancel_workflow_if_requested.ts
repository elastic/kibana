/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import { buildStepExecutionId } from '../utils';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionState } from '../workflow_context_manager/workflow_execution_state';

/**
 * This function retrieves the current workflow execution and verifies if cancellation requested.
 * In case when cancelRequested is true, it aborts the monitoredContext.abortController and marks the workflow as cancelled.
 * When monitoredContext.abortController.abort() is called, it will send cancellation signal to currently running node/step,
 * and in case if the node/step supports cancellation (like HTTP step with AbortSignal), it will stop its execution immediately.
 */
export async function cancelWorkflowIfRequested(
  workflowExecutionRepository: WorkflowExecutionRepository,
  workflowExecutionState: WorkflowExecutionState,
  monitoredStepExecutionRuntime: StepExecutionRuntime,
  monitorAbortController?: AbortController
): Promise<void> {
  const inMemoryExecution = workflowExecutionState.getWorkflowExecution();

  // Check if already cancelled in memory - if so, abort controllers and return
  if (inMemoryExecution.status === ExecutionStatus.CANCELLED) {
    monitorAbortController?.abort();
    monitoredStepExecutionRuntime.abortController.abort();
    return;
  }

  // Check cancelRequested flag in memory first
  let shouldCancel = inMemoryExecution.cancelRequested;

  if (!shouldCancel) {
    // Fetch from ES to check if cancellation was requested or status is CANCELLED
    const currentExecution = await workflowExecutionRepository.getWorkflowExecutionById(
      inMemoryExecution.id,
      inMemoryExecution.spaceId
    );

    // If status is CANCELLED in ES, we need to cancel (even if cancelRequested is false)
    // This handles the case where concurrency manager sets status to CANCELLED directly
    shouldCancel =
      currentExecution?.cancelRequested === true ||
      currentExecution?.status === ExecutionStatus.CANCELLED;

    if (shouldCancel) {
      // Update in-memory state with cancellation info from ES
      workflowExecutionState.updateWorkflowExecution({
        cancelRequested: true,
        status:
          currentExecution?.status === ExecutionStatus.CANCELLED
            ? ExecutionStatus.CANCELLED
            : inMemoryExecution.status,
        cancellationReason: currentExecution?.cancellationReason,
        cancelledAt: currentExecution?.cancelledAt,
        cancelledBy: currentExecution?.cancelledBy,
      });
    } else {
      // No cancellation requested, exit early
      return;
    }
  }

  monitorAbortController?.abort();
  monitoredStepExecutionRuntime.abortController.abort();
  let nodeStack = monitoredStepExecutionRuntime.scopeStack;

  // mark current step scopes as cancelled
  while (!nodeStack.isEmpty()) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const scopeData = nodeStack.getCurrentScope()!;
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
}
