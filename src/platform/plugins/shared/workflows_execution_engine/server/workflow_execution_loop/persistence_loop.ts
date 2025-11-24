/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionLoopParams } from './types';
import { abortableTimeout, TimeoutAbortedError } from '../utils';

export const FLUSH_INTERVAL_MS = 500;

export function flushState(params: WorkflowExecutionLoopParams) {
  return Promise.all([params.workflowExecutionState.flush(), params.workflowLogger.flushEvents()]);
}

/**
 * Continuously persists workflow execution state and logs while the workflow is running.
 *
 * This function runs a loop that flushes the workflow execution state and logger events
 * at regular intervals (every 0.5 seconds) until the workflow execution status is no longer RUNNING.
 *
 * @param params - The workflow execution loop parameters containing the workflow runtime,
 *                 execution state, and logger instances.
 * @returns A promise that resolves when the workflow execution status is no longer RUNNING.
 *
 * @example
 * ```typescript
 * await persistenceLoop({
 *   workflowRuntime,
 *   workflowExecutionState,
 *   workflowLogger
 * });
 * ```
 */
export async function persistenceLoop(params: WorkflowExecutionLoopParams) {
  while (params.workflowRuntime.getWorkflowExecutionStatus() === ExecutionStatus.RUNNING) {
    await flushState(params);

    try {
      await abortableTimeout(FLUSH_INTERVAL_MS, params.taskAbortController.signal);
    } catch (error) {
      if (error instanceof TimeoutAbortedError) {
        return;
      }

      throw error;
    }
  }
}
