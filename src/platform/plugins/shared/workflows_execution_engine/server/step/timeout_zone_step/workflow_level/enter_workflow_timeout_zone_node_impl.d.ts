import type { EnterTimeoutZoneNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { StepExecutionRuntimeFactory } from '../../../workflow_context_manager/step_execution_runtime_factory';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { MonitorableNode, NodeImplementation } from '../../node_implementation';
/** Workflow-level timeout zone; idle resume is scheduled from handleExecutionDelay, not here. */
export declare class EnterWorkflowTimeoutZoneNodeImpl implements NodeImplementation, MonitorableNode {
    private node;
    private wfExecutionRuntimeManager;
    private stepExecutionRuntimeFactory;
    constructor(node: EnterTimeoutZoneNode, wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager, stepExecutionRuntimeFactory: StepExecutionRuntimeFactory);
    run(): Promise<void>;
    monitor(monitoredStepExecutionRuntime: StepExecutionRuntime): void;
}
