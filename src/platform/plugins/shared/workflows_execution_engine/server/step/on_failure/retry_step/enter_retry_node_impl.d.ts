import type { EnterRetryNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger';
import type { NodeImplementation, NodeWithErrorCatching } from '../../node_implementation';
export declare class EnterRetryNodeImpl implements NodeImplementation, NodeWithErrorCatching {
    private node;
    private stepExecutionRuntime;
    private workflowRuntime;
    private workflowLogger;
    constructor(node: EnterRetryNode, stepExecutionRuntime: StepExecutionRuntime, workflowRuntime: WorkflowExecutionRuntimeManager, workflowLogger: IWorkflowEventLogger);
    run(): void;
    catchError(failedContext: StepExecutionRuntime): void;
    private initializeRetry;
    private advanceRetryAttempt;
}
