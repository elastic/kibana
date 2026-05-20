import type { QueryDslQueryContainer, Sort } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { WorkflowExecutionListDto } from '@kbn/workflows';
interface SearchWorkflowExecutionsParams {
    esClient: ElasticsearchClient;
    logger: Logger;
    workflowExecutionIndex: string;
    query: QueryDslQueryContainer;
    sort?: Sort;
    size?: number;
    from?: number;
    page?: number;
}
export declare const searchWorkflowExecutions: ({ esClient, logger, workflowExecutionIndex, query, sort, size, from, page, }: SearchWorkflowExecutionsParams) => Promise<WorkflowExecutionListDto>;
export {};
