import type { EnterCaseBranchNode, EnterDefaultBranchNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { NodeImplementation } from '../node_implementation';
export declare class EnterBranchNodeImpl implements NodeImplementation {
    private node;
    private wfExecutionRuntimeManager;
    private stepExecutionRuntime;
    constructor(node: EnterCaseBranchNode | EnterDefaultBranchNode, wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager, stepExecutionRuntime: StepExecutionRuntime);
    run(): void;
}
