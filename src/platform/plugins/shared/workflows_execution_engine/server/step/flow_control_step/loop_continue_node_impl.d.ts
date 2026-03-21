import type { LoopContinueNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { StepExecutionRuntimeFactory } from '../../workflow_context_manager/step_execution_runtime_factory';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';
export declare class LoopContinueNodeImpl implements NodeImplementation {
    private node;
    private stepExecutionRuntime;
    private wfExecutionRuntimeManager;
    private workflowLogger;
    private stepExecutionRuntimeFactory;
    constructor(node: LoopContinueNode, stepExecutionRuntime: StepExecutionRuntime, wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager, workflowLogger: IWorkflowEventLogger, stepExecutionRuntimeFactory: StepExecutionRuntimeFactory);
    run(): void;
}
