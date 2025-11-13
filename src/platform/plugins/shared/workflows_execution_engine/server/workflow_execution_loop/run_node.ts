/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { catchError } from './catch_error';
import { runStackMonitor } from './run_stack_monitor';
import type { WorkflowExecutionLoopParams } from './types';
import { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';

/**
 * Executes a single step in the workflow execution process.
 *
 * This function orchestrates the execution of a workflow node by:
 * 1. Creating a context manager for the current step
 * 2. Creating and running the node implementation
 * 3. Running monitoring in parallel to handle cancellation, timeouts, and other control flow
 * 4. Managing error handling and state persistence
 *
 * The execution uses a race condition between the step execution and monitoring to ensure
 * proper cancellation and timeout handling. Monitoring can prevent step execution if
 * conditions like workflow cancellation or timeout occur before the step runs.
 *
 * @param params - The workflow execution loop parameters containing:
 *   - workflowRuntime: Runtime instance managing workflow state and navigation
 *   - workflowExecutionGraph: The workflow graph definition
 *   - workflowExecutionState: Current execution state
 *   - nodesFactory: Factory for creating node implementations
 *   - esClient: Elasticsearch client for data operations
 *   - fakeRequest: Request object for context
 *   - coreStart: Kibana core services
 *
 * @returns Promise that resolves when the step execution is complete
 *
 * @throws Will catch and handle errors through the workflow runtime's error handling mechanism
 */
export async function runNode(params: WorkflowExecutionLoopParams): Promise<void> {
  const node = params.workflowRuntime.getCurrentNode();

  if (!node) {
    return;
  }

  params.workflowRuntime.exitScope();
  const stepExecutionRuntime = params.stepExecutionRuntimeFactory.createStepExecutionRuntime({
    nodeId: node.id,
    stackFrames: params.workflowRuntime.getCurrentNodeScope(),
  });

  const nodeImplementation = params.nodesFactory.create(stepExecutionRuntime);
  const monitorAbortController = new AbortController();

  // The order of these promises is important - we want to stop monitoring
  const runMonitorPromise = runStackMonitor(params, stepExecutionRuntime, monitorAbortController);
  let runStepPromise: Promise<void> = Promise.resolve();

  // Sometimes monitoring can prevent the step from running, e.g. when the workflow is cancelled, timeout occured right before running step, etc.
  if (!monitorAbortController.signal.aborted) {
    runStepPromise = nodeImplementation.run().then(() => monitorAbortController.abort());
  }

  try {
    await Promise.race([runMonitorPromise, runStepPromise]);
    params.workflowRuntime.enterScope();
    monitorAbortController.abort();
  } catch (error) {
    params.workflowRuntime.setWorkflowError(error);
  } finally {
    monitorAbortController.abort();
    await catchError(params, stepExecutionRuntime);
    await params.workflowRuntime.saveState(); // Ensure state is updated after each step
  }

  await handleExecutionDelay(params, stepExecutionRuntime);
}

const SHORT_DURATION_THRESHOLD = 1000 * 5; // 5 seconds
async function handleExecutionDelay(
  params: WorkflowExecutionLoopParams,
  stepExecutionRuntime: StepExecutionRuntime
) {
  const workflowExecution = params.workflowRuntime.getWorkflowExecution();

  if (workflowExecution.status === ExecutionStatus.WAITING && workflowExecution.resumeAt) {
    const resumeAt = new Date(workflowExecution.resumeAt);
    const now = new Date();
    const diff = resumeAt.getTime() - now.getTime();

    if (diff < SHORT_DURATION_THRESHOLD) {
      const timeout = diff > 0 ? diff : 0;
      await new Promise((resolve) => setTimeout(resolve, timeout));
      params.workflowExecutionState.updateWorkflowExecution({
        status: ExecutionStatus.RUNNING,
        resumeAt: undefined,
      });
    } else {
      await params.workflowTaskManager.scheduleResumeTask({
        runAt: resumeAt,
        workflowRunId: workflowExecution.id,
        spaceId: workflowExecution.spaceId,
      });
    }
    await params.workflowExecutionState.flush();
  }
}
