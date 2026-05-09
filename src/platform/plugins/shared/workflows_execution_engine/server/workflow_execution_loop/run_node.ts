/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import apm from 'elastic-apm-node';
import { ExecutionStatus } from '@kbn/workflows';
import { catchError } from './catch_error';
import { handleExecutionDelay } from './handle_execution_delay';
import { runStackMonitor } from './run_stack_monitor/run_stack_monitor';
import type { WorkflowExecutionLoopParams } from './types';
import { isCancellableNode } from '../step/node_implementation';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';

/**
 * Executes a single step in the workflow execution process.
 *
 * This function orchestrates the execution of a workflow node by:
 * 1. Creating a context manager for the current step
 * 2. Checking the execution driver and in-memory workflow state to skip execution when
 *    the driver is stopped (`stop()`) or the workflow is no longer RUNNING
 * 3. Creating and running the node implementation
 * 4. Running monitoring in parallel to handle cancellation, timeouts, and other control flow
 * 5. Managing error handling and state persistence
 *
 * The execution uses a race condition between the step execution and monitoring to ensure
 * proper cancellation and timeout handling. The async monitoring loop runs every 500ms in
 * parallel with step execution to detect cancellations without blocking step startup.
 *
 * @param params - The workflow execution loop parameters containing:
 *   - workflowRuntime: Runtime instance managing workflow state and navigation
 *   - workflowExecutionDriver: Current node and execution-loop gate (`isExecuting`, `start` / `stop`)
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
  const node = params.workflowExecutionDriver.currentNode;
  let monitorAbortController: AbortController | undefined;
  let stepExecutionRuntime: StepExecutionRuntime | undefined;

  if (!node) {
    return;
  }

  if (!params.workflowExecutionDriver.isExecuting) {
    return;
  }

  // Create a span for the entire node execution lifecycle
  const nodeSpan = apm.startSpan(`node: ${node.stepId || node.id}`, 'workflow', 'node');
  if (nodeSpan) {
    nodeSpan.setLabel('node_id', node.id);
    nodeSpan.setLabel('node_type', node.stepType);
    if (node.stepId) {
      nodeSpan.setLabel('step_id', node.stepId);
    }
  }

  try {
    stepExecutionRuntime = params.stepExecutionRuntimeFactory.createStepExecutionRuntime({
      nodeId: node.id,
      stackFrames: params.workflowExecutionDriver.currentStackFrames,
    });

    /**
     * Check in-memory workflow state to skip execution if workflow is no longer running.
     * This is instant (no ES call) and catches cancellations that were already detected.
     * When cancelRequested is true, status is always updated to CANCELLED, so this check
     * covers both cancellation and other terminal states (COMPLETED, FAILED, etc.).
     */
    if (
      params.workflowRuntime.getWorkflowExecution().status !== ExecutionStatus.RUNNING ||
      !params.workflowExecutionDriver.isExecuting
    ) {
      nodeSpan?.setOutcome('unknown');
      nodeSpan?.end();
      return;
    }

    const nodeImplementation = params.nodesFactory.create(stepExecutionRuntime);
    monitorAbortController = new AbortController();

    /**
     * Run monitoring in parallel with step execution to handle:
     * - Cancellation detection
     * - Timeout monitoring
     * - Custom monitoring logic for monitor-able nodes
     * The order of these promises is important - we want to stop monitoring
     */
    const runMonitorPromise = runStackMonitor(params, stepExecutionRuntime, monitorAbortController);
    let runStepPromise: Promise<void> = Promise.resolve();

    // Sometimes monitoring can prevent the step from running, e.g. when the workflow is cancelled, timeout occurred right before running step, etc.
    if (!monitorAbortController.signal.aborted) {
      runStepPromise = Promise.resolve(nodeImplementation.run()).then(
        () => stepExecutionRuntime && handleExecutionDelay(params, stepExecutionRuntime)
      );
    }

    await Promise.race([runMonitorPromise, runStepPromise]);

    if (
      stepExecutionRuntime.abortController.signal.aborted &&
      isCancellableNode(nodeImplementation)
    ) {
      try {
        await nodeImplementation.onCancel();
      } catch (onCancelError) {
        params.workflowLogger.logError(
          'Failed to execute onCancel hook - continuing execution',
          onCancelError instanceof Error ? onCancelError : new Error(String(onCancelError))
        );
      }
    }

    nodeSpan?.setOutcome('success');
  } catch (error) {
    params.workflowRuntime.setWorkflowError(error);
    nodeSpan?.setOutcome('failure');
  } finally {
    monitorAbortController?.abort();

    if (stepExecutionRuntime) {
      const catchErrorSpan = apm.startSpan('catch error handling', 'workflow', 'error_handling');
      await catchError(params, stepExecutionRuntime);
      catchErrorSpan?.end();
    }

    const saveStateSpan = apm.startSpan('save state', 'workflow', 'persistence');
    saveStateSpan?.end();

    nodeSpan?.end();
  }
}
