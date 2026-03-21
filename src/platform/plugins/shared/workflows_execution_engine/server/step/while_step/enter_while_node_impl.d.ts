import type { EnterWhileNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';
export declare class EnterWhileNodeImpl implements NodeImplementation {
    private node;
    private wfExecutionRuntimeManager;
    private stepExecutionRuntime;
    private workflowLogger;
    constructor(node: EnterWhileNode, wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager, stepExecutionRuntime: StepExecutionRuntime, workflowLogger: IWorkflowEventLogger);
    run(): void;
    private enterWhile;
    private advanceIteration;
}
