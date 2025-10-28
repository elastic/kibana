/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GraphNodeUnion } from '@kbn/workflows/graph';
import type { MonitorableNode } from '../step/node_implementation';
import { WorkflowScopeStack } from '../workflow_context_manager/workflow_scope_stack';
import { WorkflowContextManager } from '../workflow_context_manager/workflow_context_manager';
import type { WorkflowExecutionLoopParams } from './types';
import { cancelWorkflowIfRequested } from './cancel_workflow_if_requested';

/**
 * Runs a monitoring loop that continuously checks workflow execution state and invokes
 * monitoring hooks on nodes in the current execution stack.
 *
 * This function implements a background monitoring system that runs in parallel with
 * workflow step execution to provide:
 * - Cancellation detection and handling
 * - Timeout monitoring
 * - Custom monitoring logic for nodes that implement the MonitorableNode interface
 * - Stack-based monitoring from outermost to innermost scopes
 *
 * The monitoring process operates in two nested loops:
 * 1. **Outer loop**: Continues until the monitor is aborted, checking for cancellation
 *    and iterating through the node stack every 500ms
 * 2. **Inner loop**: Traverses the current node stack from outermost to innermost scope,
 *    invoking monitor() on each node that implements MonitorableNode
 *
 * Monitoring Flow:
 * 1. Check for workflow cancellation requests and handle them
 * 2. Create a scope stack from the current node stack frames
 * 3. Iterate through each scope in the stack (outermost to innermost):
 *    - Get the node for the current scope
 *    - Create a node implementation with appropriate context
 *    - If the node implements MonitorableNode, call its monitor() method
 *    - Exit to the next inner scope
 * 4. Wait 500ms before the next monitoring cycle
 * 5. Repeat until the monitor is aborted
 *
 * The monitoring runs concurrently with step execution and can be used to:
 * - Cancel long-running operations
 * - Implement timeouts
 * - Track execution progress
 * - Handle external state changes
 * - Cleanup resources during execution
 *
 *
 * @param monitoredContext - The context manager for the step being monitored,
 *   passed to monitor() methods for context-aware monitoring
 *
 * @param monitorAbortController - AbortController used to signal when monitoring
 *   should stop, typically when the monitored step completes or fails
 *
 * @returns Promise that resolves when the monitoring loop is aborted
 *
 * @throws Generally does not throw as monitoring should be resilient, but individual
 *   monitor() implementations may throw errors that bubble up
 * @see {@link MonitorableNode} - Interface for nodes that provide monitoring capabilities
 * @see {@link cancelWorkflowIfRequested} - Function for handling cancellation requests
 * @see {@link WorkflowScopeStack} - Stack management for nested workflow scopes
 */
export async function runStackMonitor(
  params: WorkflowExecutionLoopParams,
  monitoredContext: WorkflowContextManager,
  monitorAbortController: AbortController
): Promise<void> {
  const nodeStackFrames = params.workflowRuntime.getCurrentNodeScope();

  while (!monitorAbortController.signal.aborted) {
    await cancelWorkflowIfRequested(
      params.workflowExecutionRepository,
      params.workflowExecutionState,
      monitoredContext,
      monitoredContext.abortController
    );

    let nodeStack = WorkflowScopeStack.fromStackFrames(nodeStackFrames);

    while (!nodeStack.isEmpty() && !monitorAbortController.signal.aborted) {
      const scopeData = nodeStack.getCurrentScope()!;
      const node = params.workflowExecutionGraph.getNode(scopeData.nodeId);
      nodeStack = nodeStack.exitScope();

      const nodeImplementation = params.nodesFactory.create(
        new WorkflowContextManager({
          workflowExecutionGraph: params.workflowExecutionGraph,
          workflowExecutionState: params.workflowExecutionState,
          esClient: params.esClient,
          fakeRequest: params.fakeRequest,
          coreStart: params.coreStart,
          node: node as GraphNodeUnion,
          stackFrames: nodeStack.stackFrames,
        })
      );

      if (typeof (nodeImplementation as unknown as MonitorableNode).monitor === 'function') {
        const monitored = nodeImplementation as unknown as MonitorableNode;
        await monitored.monitor(monitoredContext);
      }
    }

    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 500);
      monitorAbortController.signal.addEventListener('abort', () => clearTimeout(timeout));
    });
  }
}
