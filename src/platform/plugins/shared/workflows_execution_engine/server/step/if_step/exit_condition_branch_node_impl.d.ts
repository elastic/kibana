import type { ExitConditionBranchNode, WorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { NodeImplementation } from '../node_implementation';
export declare class ExitConditionBranchNodeImpl implements NodeImplementation {
    private step;
    private workflowGraph;
    private wfExecutionRuntimeManager;
    constructor(step: ExitConditionBranchNode, workflowGraph: WorkflowGraph, wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager);
    run(): void;
}
