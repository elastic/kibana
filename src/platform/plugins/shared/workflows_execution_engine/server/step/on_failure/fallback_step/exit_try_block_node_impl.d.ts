import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { NodeImplementation } from '../../node_implementation';
export declare class ExitTryBlockNodeImpl implements NodeImplementation {
    private stepExecutionRuntime;
    private wfExecutionRuntimeManager;
    constructor(stepExecutionRuntime: StepExecutionRuntime, wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager);
    run(): Promise<void>;
}
