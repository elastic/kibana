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
export declare function executionFlowLoop(params: WorkflowExecutionLoopParams): Promise<void>;
