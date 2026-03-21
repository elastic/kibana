import type { BaseStep, RunStepResult } from './node_implementation';
import { BaseAtomicNodeImplementation } from './node_implementation';
import type { ConnectorExecutor } from '../connector_executor';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger';
export interface ConnectorStep extends BaseStep {
    'connector-id'?: string;
    with?: Record<string, any>;
}
export declare class ConnectorStepImpl extends BaseAtomicNodeImplementation<ConnectorStep> {
    private workflowLogger;
    constructor(step: ConnectorStep, stepExecutionRuntime: StepExecutionRuntime, connectorExecutor: ConnectorExecutor, workflowState: WorkflowExecutionRuntimeManager, workflowLogger: IWorkflowEventLogger);
    getInput(): Record<string, any>;
    _run(withInputs?: any): Promise<RunStepResult>;
}
