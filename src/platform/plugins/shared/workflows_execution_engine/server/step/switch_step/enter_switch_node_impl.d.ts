import type { EnterSwitchNode, WorkflowGraph } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';
export declare class EnterSwitchNodeImpl implements NodeImplementation {
    private node;
    private wfExecutionRuntimeManager;
    private workflowGraph;
    private stepExecutionRuntime;
    private workflowContextLogger;
    constructor(node: EnterSwitchNode, wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager, workflowGraph: WorkflowGraph, stepExecutionRuntime: StepExecutionRuntime, workflowContextLogger: IWorkflowEventLogger);
    run(): Promise<void>;
    private getValidatedSuccessors;
    private evaluateExpression;
    private getCaseBranches;
    private findMatchingCase;
    private getDefaultBranch;
    private setStepStateAndNavigate;
}
