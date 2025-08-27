/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { StepFactory } from './step/step_factory';
import type { WorkflowExecutionRuntimeManager } from './workflow_context_manager/workflow_execution_runtime_manager';
import type { WorkflowEventLogger } from './workflow_event_logger/workflow_event_logger';
import type { StepErrorCatcher } from './step/step_base';

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
  workflowLogger: WorkflowEventLogger,
  nodesFactory: StepFactory
) {
  while (workflowRuntime.getWorkflowExecutionStatus() === ExecutionStatus.RUNNING) {
    const currentNode = workflowRuntime.getCurrentStep();
    const step = nodesFactory.create(currentNode as any);

    try {
      await step.run();
    } catch (error) {
      workflowRuntime.setWorkflowError(error);
    } finally {
      await catchError(workflowRuntime, workflowLogger, nodesFactory);
      await workflowRuntime.saveState(); // Ensure state is updated after each step
      await workflowLogger.flushEvents();
    }
  }
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
  nodesFactory: StepFactory
) {
  try {
    while (
      workflowRuntime.getWorkflowExecution().error &&
      workflowRuntime.getWorkflowExecution().stack.length > 0
    ) {
      const stack = workflowRuntime.getWorkflowExecution().stack;
      const nodeId = stack[stack.length - 1];
      const node = workflowRuntime.getNode(nodeId);
      const stepImplementation = nodesFactory.create(node as any);

      if ((stepImplementation as unknown as StepErrorCatcher).catchError) {
        const stepErrorCatcher = stepImplementation as unknown as StepErrorCatcher;
        await stepErrorCatcher.catchError();
      }

      if (workflowRuntime.getWorkflowExecution().error) {
        await workflowRuntime.failStep(nodeId, workflowRuntime.getWorkflowExecution().error!);
      }

      workflowRuntime.exitScope();
    }
  } catch (error) {
    workflowRuntime.setWorkflowError(error);
    workflowLogger.logError(
      `Error in catchError: ${error.message}. Workflow execution may be in an inconsistent state.`
    );
  }
}
