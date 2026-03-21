import type { ElasticsearchClient } from '@kbn/core/server';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
export interface ChildWorkflowExecutionItem {
    parentStepExecutionId: string;
    workflowId: string;
    workflowName: string;
    executionId: string;
    status: string;
    stepExecutions: WorkflowStepExecutionDto[];
}
interface GetChildWorkflowExecutionsParams {
    esClient: ElasticsearchClient;
    workflowExecutionIndex: string;
    stepsExecutionIndex: string;
    parentExecutionId: string;
    spaceId: string;
}
export declare const getChildWorkflowExecutions: ({ esClient, workflowExecutionIndex, stepsExecutionIndex, parentExecutionId, spaceId, }: GetChildWorkflowExecutionsParams) => Promise<ChildWorkflowExecutionItem[]>;
export {};
