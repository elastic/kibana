import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { NodeImplementation } from '../../node_implementation';
export declare class EnterFallbackPathNodeImpl implements NodeImplementation {
    private wfExecutionRuntimeManager;
    constructor(wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager);
    run(): void;
}
