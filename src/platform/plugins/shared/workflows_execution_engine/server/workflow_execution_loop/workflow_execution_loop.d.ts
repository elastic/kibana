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
export declare function workflowExecutionLoop(params: WorkflowExecutionLoopParams): Promise<void>;
