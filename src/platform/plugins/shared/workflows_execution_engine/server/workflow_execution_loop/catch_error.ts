/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { GraphNodeUnion } from '@kbn/workflows/graph';
import type { NodeWithErrorCatching } from '../step/node_implementation';
import { WorkflowContextManager } from '../workflow_context_manager/workflow_context_manager';
import type { WorkflowExecutionLoopParams } from './types';

/**
 * Handles workflow execution errors by bubbling them up through the scope hierarchy
 * and invoking error handlers at each level.
 *
 * This function implements a sophisticated error handling mechanism that:
 * 1. Marks the failed step as FAILED in the execution state
 * 2. Traverses the scope stack in reverse order (bottom-up) to handle errors at each nested level
 * 3. Invokes custom error handlers on nodes that implement the `NodeWithErrorCatching` interface
 * 4. Ensures proper cleanup and state consistency during error propagation
 *
 * The error bubbling process works by:
 * - Starting from the innermost scope where the error occurred
 * - Moving outward through each parent scope in the stack
 * - Giving each scope's node a chance to handle or transform the error
 * - Continuing until either the error is resolved or all scopes are exhausted
 *
 * Error handling flow:
 * 1. Check if there's an active workflow error, return early if none
 * 2. Update the failed step's status to FAILED with error details
 * 3. Iterate through scope stack from innermost to outermost:
 *    - Navigate to the scope's node and exit the current scope
 *    - Create a step context for the error-handling node
 *    - Check if the node implements error catching capabilities
 *    - Invoke the node's catchError method if available
 *    - Handle any errors thrown during error handling itself
 *    - Update step status if error persists after handling attempt
 * 4. Continue until error is resolved or scope stack is exhausted
 *
 * @param params - The workflow execution parameters containing:
 *   - workflowRuntime: Runtime manager for workflow state and navigation
 *   - workflowExecutionGraph: The workflow graph definition
 *   - workflowExecutionState: Current execution state for step updates
 *   - workflowLogger: Logger for error events and debugging
 *   - nodesFactory: Factory for creating node implementations
 *   - esClient: Elasticsearch client for data operations
 *   - fakeRequest: Request context for service interactions
 *   - coreStart: Kibana core services
 *
 * @param failedStepContext - The context manager for the step that originally failed,
 *   used to update the step's status and identify the failure point
 */
export async function catchError(
  params: WorkflowExecutionLoopParams,
  failedStepContext: WorkflowContextManager
) {
  try {
    // Loop through nested scopes in reverse order to handle errors at each level.
    // The loop continues while:
    // 1. There's an active error in the workflow execution
    // 2. There are items in the execution stack
    // 3. The top stack entry has nested scopes to process
    // This allows error handling to bubble up through the scope hierarchy.

    if (!params.workflowRuntime.getWorkflowExecution().error) {
      return;
    }

    if (params.workflowExecutionState.getStepExecution(failedStepContext.stepExecutionId)) {
      await params.workflowExecutionState.upsertStep({
        id: failedStepContext.stepExecutionId,
        status: ExecutionStatus.FAILED,
        error: params.workflowRuntime.getWorkflowExecution().error,
      });
    }

    while (
      params.workflowRuntime.getWorkflowExecution().error &&
      params.workflowRuntime.getWorkflowExecution().scopeStack.length
    ) {
      // exit the whole node scope
      const scopeEntry = params.workflowRuntime
        .getWorkflowExecution()
        .scopeStack.at(-1)!
        .nestedScopes.at(-1)!;
      params.workflowRuntime.navigateToNode(scopeEntry.nodeId);
      params.workflowRuntime.exitScope();

      const node = params.workflowExecutionGraph.getNode(scopeEntry.nodeId);

      if (node) {
        params.workflowRuntime.navigateToNode(node.id);
        const stepContext = new WorkflowContextManager({
          workflowExecutionGraph: params.workflowExecutionGraph,
          workflowExecutionState: params.workflowExecutionState,
          esClient: params.esClient,
          fakeRequest: params.fakeRequest,
          coreStart: params.coreStart,
          node: node as GraphNodeUnion,
          stackFrames: params.workflowRuntime.getCurrentNodeScope(),
        });
        const stepImplementation = params.nodesFactory.create(stepContext);

        if ((stepImplementation as unknown as NodeWithErrorCatching).catchError) {
          const stepErrorCatcher = stepImplementation as unknown as NodeWithErrorCatching;

          try {
            await stepErrorCatcher.catchError();
          } catch (error) {
            params.workflowRuntime.setWorkflowError(error);
          }
        }

        if (
          params.workflowRuntime.getWorkflowExecution().error &&
          params.workflowExecutionState.getStepExecution(stepContext.stepExecutionId)
        ) {
          await params.workflowRuntime.failStep(
            params.workflowRuntime.getWorkflowExecution().error!
          );
        }
      }
    }
  } catch (error) {
    params.workflowRuntime.setWorkflowError(error);
    params.workflowLogger.logError(
      `Error in catchError: ${error.message}. Workflow execution may be in an inconsistent state.`
    );
  }
}
