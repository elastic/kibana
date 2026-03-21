import type { DataSetGraphNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { BaseStep, RunStepResult } from '../node_implementation';
import { BaseAtomicNodeImplementation } from '../node_implementation';
export interface DataSetStep extends BaseStep {
    with: Record<string, unknown>;
}
export declare class DataSetStepImpl extends BaseAtomicNodeImplementation<DataSetStep> {
    private node;
    private workflowLogger;
    constructor(node: DataSetGraphNode, stepExecutionRuntime: StepExecutionRuntime, workflowRuntime: WorkflowExecutionRuntimeManager, workflowLogger: IWorkflowEventLogger);
    getInput(): unknown;
    protected _run(input: unknown): Promise<RunStepResult>;
}
