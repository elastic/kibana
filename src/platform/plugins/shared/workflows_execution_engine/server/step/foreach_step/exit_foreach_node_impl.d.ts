import type { ExitForeachNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';
export declare class ExitForeachNodeImpl implements NodeImplementation {
    private node;
    private stepExecutionRuntime;
    private wfExecutionRuntimeManager;
    private workflowLogger;
    constructor(node: ExitForeachNode, stepExecutionRuntime: StepExecutionRuntime, wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager, workflowLogger: IWorkflowEventLogger);
    run(): void;
}
