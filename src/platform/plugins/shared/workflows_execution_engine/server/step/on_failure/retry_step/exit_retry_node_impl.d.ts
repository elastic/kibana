import type { ExitRetryNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger';
import type { NodeImplementation } from '../../node_implementation';
export declare class ExitRetryNodeImpl implements NodeImplementation {
    private node;
    private stepExecutionRuntime;
    private workflowRuntime;
    private workflowLogger;
    constructor(node: ExitRetryNode, stepExecutionRuntime: StepExecutionRuntime, workflowRuntime: WorkflowExecutionRuntimeManager, workflowLogger: IWorkflowEventLogger);
    run(): Promise<void>;
}
