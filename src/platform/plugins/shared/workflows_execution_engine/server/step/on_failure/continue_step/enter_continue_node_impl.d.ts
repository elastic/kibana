import type { EnterContinueNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger';
import type { NodeImplementation, NodeWithErrorCatching } from '../../node_implementation';
export declare class EnterContinueNodeImpl implements NodeImplementation, NodeWithErrorCatching {
    private node;
    private workflowRuntime;
    private workflowLogger;
    constructor(node: EnterContinueNode, workflowRuntime: WorkflowExecutionRuntimeManager, workflowLogger: IWorkflowEventLogger);
    run(): void;
    catchError(failedContext: StepExecutionRuntime): void;
}
