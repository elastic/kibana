import type { EsWorkflowExecution } from '@kbn/workflows';
import type { WorkflowExecutionFailedEvent } from '@kbn/workflows-extensions/server';
import type { FailedStepContext } from '../workflow_context_manager/workflow_execution_state';
/**
 * Builds the workflow_execution_failed event payload from a failed execution.
 */
export declare function buildWorkflowExecutionFailedPayload(execution: EsWorkflowExecution, failedStepContext?: FailedStepContext): WorkflowExecutionFailedEvent;
