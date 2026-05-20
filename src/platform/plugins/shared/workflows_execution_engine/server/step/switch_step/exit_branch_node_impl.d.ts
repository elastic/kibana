import type { ExitCaseBranchNode, ExitDefaultBranchNode, WorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { NodeImplementation } from '../node_implementation';
export declare class ExitBranchNodeImpl implements NodeImplementation {
    private step;
    private workflowGraph;
    private wfExecutionRuntimeManager;
    constructor(step: ExitCaseBranchNode | ExitDefaultBranchNode, workflowGraph: WorkflowGraph, wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager);
    run(): void;
}
