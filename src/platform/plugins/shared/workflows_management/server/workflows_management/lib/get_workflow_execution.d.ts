import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { WorkflowExecutionDto } from '@kbn/workflows';
interface GetWorkflowExecutionParams {
    esClient: ElasticsearchClient;
    logger: Logger;
    workflowExecutionIndex: string;
    stepsExecutionIndex: string;
    workflowExecutionId: string;
    spaceId: string;
    includeInput?: boolean;
    includeOutput?: boolean;
}
export declare const getWorkflowExecution: ({ esClient, logger, workflowExecutionIndex, stepsExecutionIndex, workflowExecutionId, spaceId, includeInput, includeOutput, }: GetWorkflowExecutionParams) => Promise<WorkflowExecutionDto | null>;
export {};
