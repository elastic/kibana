import type { KibanaGraphNode } from '@kbn/workflows/graph/types';
import type { BaseStep, RunStepResult } from './node_implementation';
import { BaseAtomicNodeImplementation } from './node_implementation';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger';
export declare class KibanaActionStepImpl extends BaseAtomicNodeImplementation<BaseStep> {
    private node;
    private workflowLogger;
    constructor(node: KibanaGraphNode, stepExecutionRuntime: StepExecutionRuntime, workflowRuntime: WorkflowExecutionRuntimeManager, workflowLogger: IWorkflowEventLogger);
    getInput(): {
        request: {
            method: "GET" | "POST" | "DELETE" | "HEAD" | "PATCH" | "PUT";
            path: string;
            body?: any;
            headers?: Record<string, string> | undefined;
        };
        use_server_info?: boolean | undefined;
        use_localhost?: boolean | undefined;
        debug?: boolean | undefined;
        fetcher?: {
            skip_ssl_verification?: boolean | undefined;
            follow_redirects?: boolean | undefined;
            max_redirects?: number | undefined;
            keep_alive?: boolean | undefined;
            max_content_length?: number | undefined;
        } | undefined;
    } | ({
        use_server_info?: boolean | undefined;
        use_localhost?: boolean | undefined;
        debug?: boolean | undefined;
        title?: string | undefined;
        description?: string | undefined;
        tags?: string[] | undefined;
        severity?: "low" | "medium" | "high" | "critical" | undefined;
        assignees?: string[] | undefined;
        owner?: string | undefined;
        connector?: Record<string, any> | undefined;
        settings?: Record<string, any> | undefined;
        id?: string | undefined;
        case_id?: string | undefined;
        space_id?: string | undefined;
        page?: number | undefined;
        perPage?: number | undefined;
        status?: string | undefined;
        fetcher?: {
            skip_ssl_verification?: boolean | undefined;
            follow_redirects?: boolean | undefined;
            max_redirects?: number | undefined;
            keep_alive?: boolean | undefined;
            max_content_length?: number | undefined;
        } | undefined;
    } & Record<string, any>);
    _run(withInputs?: any): Promise<RunStepResult>;
    private getKibanaUrl;
    private getAuthHeaders;
    private executeKibanaRequest;
    private buildFullUrl;
    private buildFormData;
    private makeHttpRequest;
    /**
     * Reads a fetch Response body as a stream with size enforcement.
     * Binary content types are returned as a raw Buffer to preserve the original bytes.
     * Text/JSON content types are decoded as UTF-8 and parsed normally.
     *
     * NOTE: Binary responses are returned as a Node.js Buffer. This works correctly within
     * the same execution (e.g. download → base64_encode → use), but Buffers serialize to
     * JSON as { type: "Buffer", data: [n, n, ...] } which is ~4x larger than the raw bytes.
     * After ES persistence and reload the deserialized object is a plain object, not a Buffer,
     * so Buffer.isBuffer() and the base64_encode filter would not handle it correctly.
     * For now this is acceptable since binary data is typically consumed immediately.
     */
    private readResponseBody;
    /**
     * Reads a Response body stream as a UTF-8 string with truncation for error bodies.
     */
    private readStreamWithLimit;
}
