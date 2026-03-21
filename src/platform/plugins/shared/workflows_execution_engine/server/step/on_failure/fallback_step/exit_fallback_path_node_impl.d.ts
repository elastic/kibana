import type { ExitFallbackPathNode } from '@kbn/workflows/graph';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { NodeImplementation } from '../../node_implementation';
export declare class ExitFallbackPathNodeImpl implements NodeImplementation {
    private node;
    private wfExecutionRuntimeManager;
    constructor(node: ExitFallbackPathNode, wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager);
    run(): void;
}
