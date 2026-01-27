/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { runNode } from './run_node';
import type { WorkflowExecutionLoopParams } from './types';

/**
 * Executes the workflow execution loop, continuously running nodes while the workflow status remains RUNNING.
 *
 * This function manages the main execution flow of a workflow by repeatedly calling `runNode`
 * until the workflow execution status changes from RUNNING to another state.
 *
 * @param params - The workflow execution loop parameters containing the workflow runtime and execution context
 * @returns A promise that resolves when the workflow execution loop completes (i.e., when the workflow is no longer in RUNNING status)
 *
 * @remarks
 * The loop will continue until the workflow status changes to a terminal state (e.g., COMPLETED, FAILED, CANCELLED).
 * Each iteration processes a single node execution.
 */
export async function executionFlowLoop(params: WorkflowExecutionLoopParams) {
  while (params.workflowRuntime.getWorkflowExecutionStatus() === ExecutionStatus.RUNNING) {
    await runNode(params);
  }
}
