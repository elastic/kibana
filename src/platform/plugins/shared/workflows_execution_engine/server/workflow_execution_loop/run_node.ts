/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GraphNodeUnion } from '@kbn/workflows/graph';
import type { WorkflowExecutionLoopParams } from './types';
import { runStackMonitor } from './run_stack_monitor';
import { catchError } from './catch_error';
import { createStepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime_factory';
import { WorkflowScopeStack } from '../workflow_context_manager/workflow_scope_stack';

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
  const currentNode = params.workflowRuntime.getCurrentNode();

  // Exit the scope of the current node if it's an exit node
  // It should be done before creating StepExecutionRuntime to ensure the scope stack for the node is correct
  // e.g. the same as for enter-* nodes
  if (currentNode?.type.startsWith('exit')) {
    params.workflowRuntime.exitScope();
  }

  const stepExecutionRuntime = createStepExecutionRuntime({
    workflowExecutionGraph: params.workflowExecutionGraph,
    workflowExecutionState: params.workflowExecutionState,
    workflowLogger: params.workflowLogger,
    esClient: params.esClient,
    fakeRequest: params.fakeRequest,
    coreStart: params.coreStart,
    node: currentNode as GraphNodeUnion,
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
    if (currentNode?.type.startsWith('enter')) {
      if (currentNode.type === 'atomic') {
        console.log();
      }

      params.workflowRuntime.enterScope();
    }
    monitorAbortController.abort();
  } catch (error) {
    params.workflowRuntime.setWorkflowError(error);
  } finally {
    monitorAbortController.abort();
    await catchError(params, stepExecutionRuntime);
    await params.workflowRuntime.saveState(); // Ensure state is updated after each step
  }
}
