import type { BaseStep, RunStepResult } from './node_implementation';
import { BaseAtomicNodeImplementation } from './node_implementation';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger';
export interface ElasticsearchActionStep extends BaseStep {
    type: string;
    with?: Record<string, any>;
}
export declare class ElasticsearchActionStepImpl extends BaseAtomicNodeImplementation<ElasticsearchActionStep> {
    private workflowLogger;
    constructor(step: ElasticsearchActionStep, contextManager: StepExecutionRuntime, workflowRuntime: WorkflowExecutionRuntimeManager, workflowLogger: IWorkflowEventLogger);
    getInput(): any;
    _run(withInputs?: any): Promise<RunStepResult>;
    private executeElasticsearchRequest;
}
