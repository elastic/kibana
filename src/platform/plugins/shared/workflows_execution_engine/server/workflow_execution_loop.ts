/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StackFrame } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { UnionExecutionGraphNode, WorkflowGraph } from '@kbn/workflows/graph';
import type { NodesFactory } from './step/nodes_factory';
import type { WorkflowExecutionRuntimeManager } from './workflow_context_manager/workflow_execution_runtime_manager';
import type { WorkflowEventLogger } from './workflow_event_logger/workflow_event_logger';
import type { NodeWithErrorCatching, MonitorableNode } from './step/node_implementation';
import type { WorkflowExecutionState } from './workflow_context_manager/workflow_execution_state';
import { WorkflowScopeStack } from './workflow_context_manager/workflow_scope_stack';

/**
 * Executes a workflow by continuously processing its steps until completion.
 *
 * This function implements a sequential workflow execution algorithm that:
 * 1. Iterates through workflow steps while the workflow status is RUNNING
 * 2. For each step:
 *    a. Retrieves the current step from the runtime
 *    b. Creates the step instance using the provided factory
 *    c. Executes the step
 *    d. Handles any errors that occur during execution
 *    e. Saves the workflow state after each step
 *    f. Flushes all logs collected during the step execution
 * 3. Ensures workflow state persistence after each step
 *
 * @param workflowRuntime - The runtime manager that tracks workflow execution state
 * @param workflowLogger - Logger responsible for capturing workflow execution events
 * @param nodesFactory - Factory for creating executable step instances
 *
 * @remarks
 * The execution loop handles errors at the step level, allowing the workflow to
 * continue or terminate based on the error handling logic in the catchError function.
 * State is saved after each step to ensure workflow can be resumed if interrupted.
 */
export async function workflowExecutionLoop(
  workflowRuntime: WorkflowExecutionRuntimeManager,
  workflowExecutionState: WorkflowExecutionState,
  workflowLogger: WorkflowEventLogger,
  nodesFactory: NodesFactory,
  workflowGraph: WorkflowGraph
) {
  while (workflowRuntime.getWorkflowExecutionStatus() === ExecutionStatus.RUNNING) {
    if (
      workflowRuntime.getWorkflowExecution().cancelRequested ||
      workflowRuntime.getWorkflowExecution().status === ExecutionStatus.CANCELLED
    ) {
      await markWorkflowCancelled(workflowExecutionState);
      break;
    }

    await runStep(workflowRuntime, nodesFactory, workflowLogger, workflowGraph);
    await workflowLogger.flushEvents();
  }
}

async function runStep(
  workflowRuntime: WorkflowExecutionRuntimeManager,
  nodesFactory: NodesFactory,
  workflowLogger: WorkflowEventLogger,
  workflowGraph: WorkflowGraph
): Promise<void> {
  const currentNode = workflowRuntime.getCurrentNode();
  const nodeImplementation = nodesFactory.create(currentNode as any);
  const stepAbortController = new AbortController();
  const monitorAbortController = new AbortController();

  try {
    await Promise.race([
      runStackMonitor(
        workflowRuntime.getCurrentNodeScope(),
        workflowGraph,
        nodesFactory,
        monitorAbortController
      ),
      nodeImplementation.run(),
    ]);
    monitorAbortController.abort();
  } catch (error) {
    stepAbortController.abort();
    workflowRuntime.setWorkflowError(error);
    await workflowRuntime.failStep(error);
  } finally {
    monitorAbortController.abort();
    await catchError(workflowRuntime, workflowLogger, nodesFactory, workflowGraph);
    await workflowRuntime.saveState(); // Ensure state is updated after each step
  }
}

/**
 * Continuously monitors the workflow execution stack by calling monitor() on nodes that implement MonitorableNode.
 *
 * This function runs in parallel with step execution to provide periodic health checks and monitoring
 * capabilities for workflow nodes. It iterates through the node stack frames and calls the monitor()
 * method on any nodes that implement the MonitorableNode interface.
 *
 * The monitor runs at regular intervals (every 500ms) and can be used for various monitoring purposes:
 * - Timeout detection (checking if steps exceed their allowed execution time)
 * - Resource monitoring (memory, CPU, external dependencies)
 * - Health checks (verifying external services are available)
 * - Custom validation logic (ensuring step conditions remain valid)
 *
 * If any monitor() call throws an error, it indicates a monitoring condition has been violated
 * (e.g., timeout exceeded) and the error will propagate to stop the workflow execution.
 *
 * @param nodeStackFrames - The stack frames representing the current execution context
 * @param workflowGraph - The workflow graph containing node definitions
 * @param nodesFactory - Factory for creating node implementation instances
 * @param monitorAbortController - AbortController to stop the monitoring loop
 *
 * @remarks
 * The monitoring loop continues until the AbortController is signaled. Each monitoring cycle
 * recreates the node stack from the original frames to ensure consistency.
 */
async function runStackMonitor(
  nodeStackFrames: StackFrame[],
  workflowGraph: WorkflowGraph,
  nodesFactory: NodesFactory,
  monitorAbortController: AbortController
): Promise<void> {
  while (!monitorAbortController.signal.aborted) {
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 500);
      monitorAbortController.signal.addEventListener('abort', () => clearTimeout(timeout));
    });

    let nodeStack = WorkflowScopeStack.fromStackFrames(nodeStackFrames);

    while (!nodeStack.isEmpty() && !monitorAbortController.signal.aborted) {
      const scopeData = nodeStack.getCurrentScope()!;
      const node = workflowGraph.getNode(scopeData.nodeId);
      nodeStack = nodeStack.exitScope();

      const nodeImplementation = nodesFactory.create(node as UnionExecutionGraphNode);

      if (typeof (nodeImplementation as unknown as MonitorableNode).monitor === 'function') {
        const monitored = nodeImplementation as unknown as MonitorableNode;
        await monitored.monitor(nodeStack);
      }
    }
  }
}

async function markWorkflowCancelled(
  workflowExecutionState: WorkflowExecutionState
): Promise<void> {
  const inProgressSteps = workflowExecutionState
    .getAllStepExecutions()
    .filter((stepExecution) =>
      [
        ExecutionStatus.RUNNING,
        ExecutionStatus.WAITING,
        ExecutionStatus.WAITING_FOR_INPUT,
        ExecutionStatus.PENDING,
      ].includes(stepExecution.status)
    );

  inProgressSteps.forEach((runningStep) =>
    workflowExecutionState.upsertStep({
      id: runningStep.id,
      status: ExecutionStatus.CANCELLED,
    })
  );
  workflowExecutionState.updateWorkflowExecution({
    status: ExecutionStatus.CANCELLED,
  });

  await workflowExecutionState.flush();
}

/**
 * Handles errors in workflow execution by iterating through the execution stack and attempting to catch errors at each step.
 *
 * The algorithm works as follows:
 * 1. While there is an error in the workflow execution and the stack is not empty:
 *    a. Get the top nodeId from the stack
 *    b. Retrieve the node corresponding to this nodeId
 *    c. Create a step implementation for this node
 *    d. If the step implementation has a catchError method, invoke it to handle the error
 *    e. If the workflow execution still has an error after catchError is called, mark the step as failed
 *    f. Exit the current scope (pop from the stack)
 * 2. If an error occurs during this process, set it as the workflow error and log it
 *
 * @param workflowRuntime - Manager for the workflow execution state
 * @param workflowLogger - Logger for workflow events
 * @param nodesFactory - Factory for creating step implementations
 */
async function catchError(
  workflowRuntime: WorkflowExecutionRuntimeManager,
  workflowLogger: WorkflowEventLogger,
  nodesFactory: NodesFactory,
  workflowGraph: WorkflowGraph
) {
  try {
    // Loop through nested scopes in reverse order to handle errors at each level.
    // The loop continues while:
    // 1. There's an active error in the workflow execution
    // 2. There are items in the execution stack
    // 3. The top stack entry has nested scopes to process
    // This allows error handling to bubble up through the scope hierarchy.
    while (
      workflowRuntime.getWorkflowExecution().error &&
      workflowRuntime.getWorkflowExecution().scopeStack.length
    ) {
      // exit the whole node scope
      const scopeEntry = workflowRuntime
        .getWorkflowExecution()
        .scopeStack.at(-1)!
        .nestedScopes.at(-1)!;
      workflowRuntime.navigateToNode(scopeEntry.nodeId);
      workflowRuntime.exitScope();

      const node = workflowGraph.getNode(scopeEntry.nodeId);

      if (node) {
        workflowRuntime.navigateToNode(node.id);
        const stepImplementation = nodesFactory.create(node as any);

        if ((stepImplementation as unknown as NodeWithErrorCatching).catchError) {
          const stepErrorCatcher = stepImplementation as unknown as NodeWithErrorCatching;

          try {
            await stepErrorCatcher.catchError();
          } catch (error) {
            workflowRuntime.setWorkflowError(error);
          }
        }

        if (workflowRuntime.getWorkflowExecution().error) {
          await workflowRuntime.failStep(workflowRuntime.getWorkflowExecution().error!);
        }
      }
    }
  } catch (error) {
    workflowRuntime.setWorkflowError(error);
    workflowLogger.logError(
      `Error in catchError: ${error.message}. Workflow execution may be in an inconsistent state.`
    );
  }
}
