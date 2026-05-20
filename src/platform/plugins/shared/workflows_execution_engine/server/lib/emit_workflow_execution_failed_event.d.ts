import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { EmitEvent } from '../trigger_events';
import type { FailedStepContext } from '../workflow_context_manager/workflow_execution_state';
export interface WorkflowRuntimeForEmit {
    getWorkflowExecutionStatus(): ExecutionStatus;
    getWorkflowExecution(): EsWorkflowExecution;
}
export interface WorkflowExecutionStateForEmit {
    getLastFailedStepContext(): FailedStepContext | undefined;
}
/**
 * If the current run ended in FAILED and is not a test run, builds the
 * workflow_execution_failed payload from in-memory state and emits it via
 * emitEvent. Logs a warning on emit failure; does not throw.
 */
export declare function emitWorkflowExecutionFailedEventIfFailed(params: {
    workflowRuntime: WorkflowRuntimeForEmit;
    workflowExecutionState: WorkflowExecutionStateForEmit;
    emitEvent: EmitEvent;
    request: KibanaRequest;
    logger: Logger;
    workflowRunId: string;
}): Promise<void>;
