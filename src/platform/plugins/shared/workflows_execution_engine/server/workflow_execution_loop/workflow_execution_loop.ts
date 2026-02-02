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
import { executionFlowLoop } from './execution_flow_loop';
import { flushState, persistenceLoop } from './persistence_loop';
import type { WorkflowExecutionLoopParams } from './types';

/**
 * Executes the main workflow execution loop, processing nodes sequentially until completion.
 *
 * This function serves as the primary entry point for workflow execution, continuously
 * processing workflow nodes until the workflow reaches a terminal state (completed, failed,
 * or cancelled). The loop orchestrates the execution of individual workflow steps and
 * ensures proper logging and state management throughout the process.
 *
 * The execution loop follows this pattern:
 * 1. Check if workflow is still in RUNNING state
 * 2. Execute the current workflow node via runNode()
 * 3. Flush any pending log events to ensure proper audit trail
 * 4. Repeat until workflow execution is complete
 *
 * The loop will automatically terminate when:
 * - Workflow completes successfully (ExecutionStatus.COMPLETED)
 * - Workflow fails due to an error (ExecutionStatus.FAILED)
 * - Workflow is cancelled (ExecutionStatus.CANCELLED)
 * - Any other non-RUNNING status is reached
 */
export async function workflowExecutionLoop(params: WorkflowExecutionLoopParams) {
  // Create an abort controller to signal the persistence loop to exit immediately
  // when execution completes (instead of waiting for the next 500ms flush cycle)
  const persistenceAbortController = new AbortController();

  params.taskAbortController.signal.addEventListener('abort', () => {
    params.workflowExecutionState.updateWorkflowExecution({
      cancelRequested: true,
      cancelledAt: new Date().toISOString(),
      cancellationReason: 'Task aborted',
      status: ExecutionStatus.CANCELLED,
    });
    // Also abort persistence loop when task is aborted
    persistenceAbortController.abort();
  });

  try {
    // Run execution and persistence loops in parallel
    // When execution finishes, signal persistence loop to exit immediately
    await Promise.all([
      executionFlowLoop(params).finally(() => {
        // Signal persistence loop to stop waiting and exit
        persistenceAbortController.abort();
      }),
      persistenceLoop(params, persistenceAbortController.signal),
    ]);
  } catch (error) {
    params.workflowRuntime.setWorkflowError(error as Error);
  } finally {
    const finalFlushSpan = apm.startSpan('final flush state', 'workflow', 'persistence');
    await flushState(params);
    finalFlushSpan?.end();
  }

  // Final save to ensure workflow state is persisted after execution loop
  const finalSaveSpan = apm.startSpan('final save state', 'workflow', 'persistence');
  await params.workflowRuntime.saveState();
  finalSaveSpan?.end();

  // Flush the final state (including terminal status) to Elasticsearch
  const finalStateFlushSpan = apm.startSpan('final state flush', 'workflow', 'persistence');
  await params.workflowExecutionState.flush();
  finalStateFlushSpan?.end();

  const finalLogFlushSpan = apm.startSpan('final flush logs', 'workflow', 'logging');
  await params.workflowLogger.flushEvents();
  finalLogFlushSpan?.end();
}
