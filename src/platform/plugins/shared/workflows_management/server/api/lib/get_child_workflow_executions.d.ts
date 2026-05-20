import type { ElasticsearchClient } from '@kbn/core/server';
import type { ChildWorkflowExecutionItem } from '@kbn/workflows';
interface GetChildWorkflowExecutionsParams {
    esClient: ElasticsearchClient;
    workflowExecutionIndex: string;
    stepsExecutionIndex: string;
    parentExecutionId: string;
    spaceId: string;
}
export declare const getChildWorkflowExecutions: ({ esClient, workflowExecutionIndex, stepsExecutionIndex, parentExecutionId, spaceId, }: GetChildWorkflowExecutionsParams) => Promise<ChildWorkflowExecutionItem[]>;
export {};
