/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { UnionExecutionGraphNode, WorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowExecutionRuntimeManager } from './workflow_context_manager/workflow_execution_runtime_manager';
import type { WorkflowEventLogger } from './workflow_event_logger/workflow_event_logger';
import type { NodeWithErrorCatching, MonitorableNode } from './step/node_implementation';
import type { WorkflowExecutionState } from './workflow_context_manager/workflow_execution_state';
import { WorkflowScopeStack } from './workflow_context_manager/workflow_scope_stack';
import type { NodesFactory } from './step/nodes_factory';
import { WorkflowContextManager } from './workflow_context_manager/workflow_context_manager';
import type { WorkflowExecutionRepository } from './repositories/workflow_execution_repository';
import { buildStepExecutionId } from './utils';

export interface WorkflowExecutionLoopParams {
  workflowExecutionGraph: WorkflowGraph;
  workflowRuntime: WorkflowExecutionRuntimeManager;
  workflowExecutionState: WorkflowExecutionState;
  workflowLogger: WorkflowEventLogger;
  workflowExecutionRepository: WorkflowExecutionRepository;
  nodesFactory: NodesFactory;
  esClient: any; // TODO: properly type it
  fakeRequest: any; // TODO: properly type it
  coreStart: any; // TODO: properly type it
}

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
export async function workflowExecutionLoop(params: WorkflowExecutionLoopParams) {
  while (params.workflowRuntime.getWorkflowExecutionStatus() === ExecutionStatus.RUNNING) {
    await runStep(params);
    await params.workflowLogger.flushEvents();
  }
}

async function runStep(params: WorkflowExecutionLoopParams): Promise<void> {
  const currentNode = params.workflowRuntime.getCurrentNode();
  const stepContext = new WorkflowContextManager({
    workflowExecutionGraph: params.workflowExecutionGraph,
    workflowExecutionState: params.workflowExecutionState,
    esClient: params.esClient,
    fakeRequest: params.fakeRequest,
    coreStart: params.coreStart,
    node: currentNode as UnionExecutionGraphNode,
    stackFrames: params.workflowRuntime.getCurrentNodeScope(),
  });
  const nodeImplementation = params.nodesFactory.create(stepContext);
  const monitorAbortController = new AbortController();

  const runMonitorPromise = runStackMonitor(params, stepContext, monitorAbortController);
  const runStepPormise = nodeImplementation.run().then(() => monitorAbortController.abort());

  try {
    await Promise.race([runMonitorPromise, runStepPormise]);
    monitorAbortController.abort();
  } catch (error) {
    params.workflowRuntime.setWorkflowError(error);
  } finally {
    monitorAbortController.abort();
    await catchError(params, stepContext);
    await params.workflowRuntime.saveState(); // Ensure state is updated after each step
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
          node: node as UnionExecutionGraphNode,
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

/**
 * This function retrieves the current workflow execution and verifies if cancellation requested.
 * In case when cancelRequested is true, it aborts the monitoredContext.abortController and marks the workflow as cancelled.
 * When monitoredContext.abortController.abort() is called, it will send cancellation signal to currently running node/step,
 * and in case if the node/step supports cancellation (like HTTP step with AbortSignal), it will stop its execution immediately.
 */
async function cancelWorkflowIfRequested(
  workflowExecutionRepository: WorkflowExecutionRepository,
  workflowExecutionState: WorkflowExecutionState,
  monitoredContext: WorkflowContextManager,
  monitorAbortController?: AbortController
): Promise<void> {
  const currentExecution = await workflowExecutionRepository.getWorkflowExecutionById(
    workflowExecutionState.getWorkflowExecution().id,
    workflowExecutionState.getWorkflowExecution().spaceId
  );

  if (!currentExecution?.cancelRequested) {
    return;
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
        id: buildStepExecutionId(
          workflowExecutionState.getWorkflowExecution().id,
          scopeData.stepId,
          nodeStack.stackFrames
        ),
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
          node: node as UnionExecutionGraphNode,
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
