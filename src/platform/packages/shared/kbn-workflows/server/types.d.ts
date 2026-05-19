import type { CustomRequestHandlerContext, KibanaRequest } from '@kbn/core/server';
/**
 * The workflows client.
 * This is the public interface for workflows operations that can be used by any plugin.
 * It is registered to the `workflows` API request context, and exposed by `workflowsExtensions` plugin in its start contract.
 */
export interface WorkflowsClient {
    isWorkflowsAvailable: boolean;
    emitEvent: (triggerId: string, payload: Record<string, unknown>) => Promise<void>;
}
export type WorkflowsApiRequestHandlerContext = WorkflowsClient;
export type WorkflowsRequestHandlerContext = CustomRequestHandlerContext<{
    workflows: WorkflowsApiRequestHandlerContext;
}>;
export type WorkflowsClientProvider = (request: KibanaRequest) => Promise<WorkflowsClient>;
