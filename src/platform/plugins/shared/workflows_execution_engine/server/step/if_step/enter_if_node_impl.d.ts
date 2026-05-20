import type { EnterIfNode, WorkflowGraph } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';
export declare class EnterIfNodeImpl implements NodeImplementation {
    private node;
    private wfExecutionRuntimeManager;
    private workflowGraph;
    private stepExecutionRuntime;
    private workflowContextLogger;
    constructor(node: EnterIfNode, wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager, workflowGraph: WorkflowGraph, stepExecutionRuntime: StepExecutionRuntime, workflowContextLogger: IWorkflowEventLogger);
    run(): Promise<void>;
    private goToThenBranch;
    private goToElseBranch;
    private goToExitNode;
}
