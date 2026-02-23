/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { runNode } from './run_node';
import type { WorkflowExecutionLoopParams } from './types';
import { isCancellableNode } from '../step/node_implementation';

/**
 * Executes the workflow execution loop, continuously running nodes while the workflow status remains RUNNING.
 *
 * This function manages the main execution flow of a workflow by repeatedly calling `runNode`
 * until the workflow execution status changes from RUNNING to another state.
 *
 * When the workflow was already CANCELLED before the loop could enter (e.g. cancel requested
 * while a step was in waiting state), the current node's onCancel hook is invoked so that
 * CancellableNode steps can perform cleanup without re-invoking run().
 *
 * @param params - The workflow execution loop parameters containing the workflow runtime and execution context
 * @returns A promise that resolves when the workflow execution loop completes (i.e., when the workflow is no longer in RUNNING status)
 *
 * @remarks
 * The loop will continue until the workflow status changes to a terminal state (e.g., COMPLETED, FAILED, CANCELLED).
 * Each iteration processes a single node execution.
 */
export async function executionFlowLoop(params: WorkflowExecutionLoopParams) {
  let didEnterLoop = false;

  while (params.workflowRuntime.getWorkflowExecutionStatus() === ExecutionStatus.RUNNING) {
    didEnterLoop = true;
    await runNode(params);
  }

  if (
    !didEnterLoop &&
    params.workflowRuntime.getWorkflowExecutionStatus() === ExecutionStatus.CANCELLED
  ) {
    const node = params.workflowRuntime.getCurrentNode();
    if (node) {
      const stepExecutionRuntime =
        params.stepExecutionRuntimeFactory.createStepExecutionRuntime({
          nodeId: node.id,
          stackFrames: params.workflowRuntime.getCurrentNodeScope(),
        });
      const nodeImplementation = params.nodesFactory.create(stepExecutionRuntime);
      if (isCancellableNode(nodeImplementation)) {
        try {
          await nodeImplementation.onCancel();
        } catch (onCancelError) {
          params.workflowLogger.logError(
            'Failed to execute onCancel hook - continuing cancellation',
            onCancelError instanceof Error ? onCancelError : new Error(String(onCancelError))
          );
        }
      }
    }
  }
}
