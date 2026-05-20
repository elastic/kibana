import type { ElasticsearchGraphNode } from '@kbn/workflows/graph/types';
import type { BaseStep, RunStepResult } from './node_implementation';
import { BaseAtomicNodeImplementation } from './node_implementation';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger';
export declare class ElasticsearchActionStepImpl extends BaseAtomicNodeImplementation<BaseStep> {
    private node;
    private workflowLogger;
    constructor(node: ElasticsearchGraphNode, contextManager: StepExecutionRuntime, workflowRuntime: WorkflowExecutionRuntimeManager, workflowLogger: IWorkflowEventLogger);
    getInput(): {
        request: {
            method: "GET" | "POST" | "DELETE" | "HEAD" | "PATCH" | "PUT";
            path: string;
            body?: any;
        };
    } | ({
        index?: string | undefined;
        id?: string | undefined;
        query?: Record<string, any> | undefined;
        body?: Record<string, any> | undefined;
        size?: number | undefined;
        from?: number | undefined;
        sort?: any[] | undefined;
        _source?: string | boolean | string[] | undefined;
        aggs?: Record<string, any> | undefined;
        aggregations?: Record<string, any> | undefined;
    } & Record<string, any>);
    _run(withInputs?: any): Promise<RunStepResult>;
    private executeElasticsearchRequest;
}
