/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import type { NodesFactory } from './step/nodes_factory';
import type { WorkflowExecutionRuntimeManager } from './workflow_context_manager/workflow_execution_runtime_manager';
import type { WorkflowEventLogger } from './workflow_event_logger/workflow_event_logger';
import type { StepErrorCatcher } from './step/node_implementation';
import type { WorkflowExecutionState } from './workflow_context_manager/workflow_execution_state';

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

  try {
    await nodeImplementation.run();
  } catch (error) {
    workflowRuntime.setWorkflowError(error);
    await workflowRuntime.failStep(error);
  } finally {
    await catchError(workflowRuntime, workflowLogger, nodesFactory, workflowGraph);
    await workflowRuntime.saveState(); // Ensure state is updated after each step
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
    while (
      workflowRuntime.getWorkflowExecution().error &&
      workflowRuntime.getWorkflowExecution().stack.length > 0
    ) {
      const stack = workflowRuntime.getWorkflowExecution().stack;
      const stackEntry = stack[stack.length - 1];

      // exit the whole node scope
      workflowRuntime.exitScope();
      workflowRuntime.navigateToNode(stackEntry.nodeId);

      const node = workflowGraph.getNode(stackEntry.nodeId);

      if (node) {
        workflowRuntime.navigateToNode(node.id);
        const stepImplementation = nodesFactory.create(node as any);

        if ((stepImplementation as unknown as StepErrorCatcher).catchError) {
          const stepErrorCatcher = stepImplementation as unknown as StepErrorCatcher;

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
