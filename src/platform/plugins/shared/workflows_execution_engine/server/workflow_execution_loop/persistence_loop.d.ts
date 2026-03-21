import type { WorkflowExecutionLoopParams } from './types';
export declare const FLUSH_INTERVAL_MS = 500;
export declare function flushState(params: WorkflowExecutionLoopParams): Promise<void>;
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
export declare function persistenceLoop(params: WorkflowExecutionLoopParams, persistenceAbortSignal?: AbortSignal): Promise<void>;
