import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionState } from '../workflow_context_manager/workflow_execution_state';
import type { IWorkflowEventLogger } from '../workflow_event_logger';
/**
 * This function retrieves the current workflow execution and verifies if cancellation requested.
 * In case when cancelRequested is true, it aborts the monitoredContext.abortController and marks the workflow as cancelled.
 * When monitoredContext.abortController.abort() is called, it will send cancellation signal to currently running node/step,
 * and in case if the node/step supports cancellation (like HTTP step with AbortSignal), it will stop its execution immediately.
 *
 * This function is designed to be resilient - if the cancellation check fails (e.g., due to network issues),
 * it will log the error but not throw, allowing the step execution to continue. This prevents infrastructure
 * issues from causing step execution failures.
 */
export declare function cancelWorkflowIfRequested(workflowExecutionRepository: WorkflowExecutionRepository, workflowExecutionState: WorkflowExecutionState, monitoredStepExecutionRuntime: StepExecutionRuntime, workflowLogger: IWorkflowEventLogger, monitorAbortController?: AbortController): Promise<void>;
