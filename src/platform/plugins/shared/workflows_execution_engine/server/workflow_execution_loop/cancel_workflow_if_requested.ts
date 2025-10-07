/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionState } from '../workflow_context_manager/workflow_execution_state';
import type { WorkflowContextManager } from '../workflow_context_manager/workflow_context_manager';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import { buildStepExecutionId } from '../utils';

/**
 * This function retrieves the current workflow execution and verifies if cancellation requested.
 * In case when cancelRequested is true, it aborts the monitoredContext.abortController and marks the workflow as cancelled.
 * When monitoredContext.abortController.abort() is called, it will send cancellation signal to currently running node/step,
 * and in case if the node/step supports cancellation (like HTTP step with AbortSignal), it will stop its execution immediately.
 */
export async function cancelWorkflowIfRequested(
  workflowExecutionRepository: WorkflowExecutionRepository,
  workflowExecutionState: WorkflowExecutionState,
  monitoredContext: WorkflowContextManager,
  monitorAbortController?: AbortController
): Promise<void> {
  if (!workflowExecutionState.getWorkflowExecution().cancelRequested) {
    const currentExecution = await workflowExecutionRepository.getWorkflowExecutionById(
      workflowExecutionState.getWorkflowExecution().id,
      workflowExecutionState.getWorkflowExecution().spaceId
    );

    if (!currentExecution?.cancelRequested) {
      return;
    }
  }

  monitorAbortController?.abort();
  monitoredContext.abortController.abort();
  let nodeStack = monitoredContext.scopeStack;

  // mark current step scopes as cancelled
  while (!nodeStack.isEmpty()) {
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
    id: monitoredContext.stepExecutionId,
    status: ExecutionStatus.CANCELLED,
  });
  workflowExecutionState.updateWorkflowExecution({
    status: ExecutionStatus.CANCELLED,
  });
}
