import type { EnterTimeoutZoneNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { MonitorableNode, NodeImplementation } from '../../node_implementation';
export declare class EnterStepTimeoutZoneNodeImpl implements NodeImplementation, MonitorableNode {
    private node;
    private wfExecutionRuntimeManager;
    private stepExecutionRuntime;
    constructor(node: EnterTimeoutZoneNode, wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager, stepExecutionRuntime: StepExecutionRuntime);
    run(): Promise<void>;
    monitor(monitoredContext: StepExecutionRuntime): void;
}
