import type { EnterTryBlockNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { NodeImplementation, NodeWithErrorCatching } from '../../node_implementation';
export declare class EnterTryBlockNodeImpl implements NodeImplementation, NodeWithErrorCatching {
    private node;
    private stepExecutionRuntime;
    private wfExecutionRuntimeManager;
    constructor(node: EnterTryBlockNode, stepExecutionRuntime: StepExecutionRuntime, wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager);
    run(): void;
    catchError(): void;
}
