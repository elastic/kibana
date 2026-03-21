import type { EnterForeachNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';
export declare class EnterForeachNodeImpl implements NodeImplementation {
    private node;
    private wfExecutionRuntimeManager;
    private stepExecutionRuntime;
    private workflowLogger;
    constructor(node: EnterForeachNode, wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager, stepExecutionRuntime: StepExecutionRuntime, workflowLogger: IWorkflowEventLogger);
    run(): Promise<void>;
    private enterForeach;
    private advanceIteration;
    private getItems;
    private processForeachConfiguration;
}
