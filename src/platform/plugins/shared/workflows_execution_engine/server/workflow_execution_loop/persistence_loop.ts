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
import type { WorkflowExecutionLoopParams } from './types';
import { abortableTimeout, TimeoutAbortedError } from '../utils';

export const FLUSH_INTERVAL_MS = 500;

export async function flushState(params: WorkflowExecutionLoopParams) {
  const flushSpan = apm.startSpan('persistence flush', 'workflow', 'persistence');
  await Promise.all([params.workflowExecutionState.flush(), params.workflowLogger.flushEvents()]);
  flushSpan?.end();
}

/**
 * Continuously persists workflow execution state and logs while the workflow is running.
 *
 * This function runs a loop that flushes the workflow execution state and logger events
 * at regular intervals (every 0.5 seconds) until the workflow execution status is no longer RUNNING
 * OR until the persistenceAbortSignal is triggered (indicating execution has completed).
 *
 * @param params - The workflow execution loop parameters containing the workflow runtime,
 *                 execution state, and logger instances.
 * @param persistenceAbortSignal - Optional signal to abort the persistence loop immediately
 *                                  when execution completes (avoids waiting for the next flush cycle).
 * @returns A promise that resolves when the workflow execution status is no longer RUNNING
 *          or when the abort signal is triggered.
 *
 * @example
 * ```typescript
 * const abortController = new AbortController();
 * await persistenceLoop(params, abortController.signal);
 * ```
 */
export async function persistenceLoop(
  params: WorkflowExecutionLoopParams,
  persistenceAbortSignal?: AbortSignal
) {
  while (params.workflowRuntime.getWorkflowExecutionStatus() === ExecutionStatus.RUNNING) {
    // Check if we should exit immediately (execution completed)
    if (persistenceAbortSignal?.aborted) {
      return;
    }

    await flushState(params);

    try {
      // Wait for flush interval, but can be interrupted by either:
      // 1. Task abort (task cancelled)
      // 2. Persistence abort (execution completed - exit immediately)
      const waitSpan = apm.startSpan('persistence wait', 'workflow', 'wait');
      await Promise.race([
        abortableTimeout(FLUSH_INTERVAL_MS, params.taskAbortController.signal),
        persistenceAbortSignal
          ? new Promise<void>((_, reject) => {
              if (persistenceAbortSignal.aborted) {
                reject(new TimeoutAbortedError());
              }
              persistenceAbortSignal.addEventListener('abort', () => {
                reject(new TimeoutAbortedError());
              });
            })
          : new Promise<void>(() => {}), // Never resolves if no signal provided
      ]);
      waitSpan?.end();
    } catch (error) {
      if (error instanceof TimeoutAbortedError) {
        return;
      }

      throw error;
    }
  }
}
