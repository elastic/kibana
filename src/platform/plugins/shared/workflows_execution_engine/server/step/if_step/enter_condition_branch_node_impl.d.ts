import type { EnterConditionBranchNode } from '@kbn/workflows/graph';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { NodeImplementation } from '../node_implementation';
export declare class EnterConditionBranchNodeImpl implements NodeImplementation {
    private node;
    private wfExecutionRuntimeManager;
    constructor(node: EnterConditionBranchNode, wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager);
    run(): void;
}
