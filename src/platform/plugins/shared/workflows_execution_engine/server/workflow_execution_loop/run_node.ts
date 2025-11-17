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
import { handleExecutionDelay } from './handle_execution_delay';
import { processNodeStackMonitoring } from './run_stack_monitor/process_node_stack_monitoring';
import { runStackMonitor } from './run_stack_monitor/run_stack_monitor';
import type { WorkflowExecutionLoopParams } from './types';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';

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
  let monitorAbortController: AbortController | undefined;
  let stepExecutionRuntime: StepExecutionRuntime | undefined;

  if (!node) {
    return;
  }
  try {
    params.workflowRuntime.exitScope();
    stepExecutionRuntime = params.stepExecutionRuntimeFactory.createStepExecutionRuntime({
      nodeId: node.id,
      stackFrames: params.workflowRuntime.getCurrentNodeScope(),
    });

    /**
     * Before running the step, we run monitoring once to handle cases where
     * the step should not be executed at all, e.g., if the workflow has been
     * cancelled or a timeout has already occurred.
     */
    await processNodeStackMonitoring(params, stepExecutionRuntime);

    /**
     * If the workflow is no longer running after processing the node stack (e.g., cancelled), we skip executing the step.
     */
    if (params.workflowRuntime.getWorkflowExecution().status !== ExecutionStatus.RUNNING) {
      return;
    }

    const nodeImplementation = params.nodesFactory.create(stepExecutionRuntime);
    monitorAbortController = new AbortController();

    /**
     * Run monitoring in parallel with step execution to handle:
     * - Cancellation detection
     * - Timeout monitoring
     * - Custom monitoring logic for monitorable nodes
     * The order of these promises is important - we want to stop monitoring
     */
    const runMonitorPromise = runStackMonitor(params, stepExecutionRuntime, monitorAbortController);
    let runStepPromise: Promise<void> = Promise.resolve();

    // Sometimes monitoring can prevent the step from running, e.g. when the workflow is cancelled, timeout occured right before running step, etc.
    if (!monitorAbortController.signal.aborted) {
      runStepPromise = nodeImplementation
        .run()
        .finally(() => stepExecutionRuntime && handleExecutionDelay(params, stepExecutionRuntime))
        .finally(() => monitorAbortController?.abort());
    }

    await Promise.race([runMonitorPromise, runStepPromise]);
    params.workflowRuntime.enterScope();
    monitorAbortController.abort();
  } catch (error) {
    params.workflowRuntime.setWorkflowError(error);
  } finally {
    monitorAbortController?.abort();

    if (stepExecutionRuntime) {
      await catchError(params, stepExecutionRuntime);
    }

    await params.workflowRuntime.saveState(); // Ensure state is updated after each step
  }
}
