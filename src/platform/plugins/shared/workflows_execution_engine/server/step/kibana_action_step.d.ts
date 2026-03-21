import type { BaseStep, RunStepResult } from './node_implementation';
import { BaseAtomicNodeImplementation } from './node_implementation';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger';
export interface KibanaActionStep extends BaseStep {
    type: string;
    with?: Record<string, any>;
}
export declare class KibanaActionStepImpl extends BaseAtomicNodeImplementation<KibanaActionStep> {
    private workflowLogger;
    constructor(step: KibanaActionStep, stepExecutionRuntime: StepExecutionRuntime, workflowRuntime: WorkflowExecutionRuntimeManager, workflowLogger: IWorkflowEventLogger);
    getInput(): any;
    _run(withInputs?: any): Promise<RunStepResult>;
    private getKibanaUrl;
    private getAuthHeaders;
    private executeKibanaRequest;
    private buildFullUrl;
    private makeHttpRequest;
    /**
     * Reads a fetch Response body as a stream with size enforcement.
     * Delegates to the shared stream reader with 'throw' behavior on size exceeded.
     */
    private readResponseBody;
    /**
     * Reads a Response body stream with a byte-size limit.
     * Two behaviors when the limit is exceeded:
     *  - 'throw': cancels the stream and throws a ResponseSizeLimitError
     *  - 'truncate': cancels the stream and returns the data read so far with a truncation marker
     */
    private readStreamWithLimit;
}
