import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EsWorkflow } from '../..';
export interface WorkflowRepositoryOptions {
    esClient: ElasticsearchClient;
    logger: Logger;
    indexName?: string;
}
export declare class WorkflowRepository {
    private options;
    constructor(options: WorkflowRepositoryOptions);
    /**
     * Get a workflow by ID and space ID
     */
    getWorkflow(workflowId: string, spaceId: string): Promise<EsWorkflow | null>;
    /**
     * Check if a workflow is enabled by ID and space ID
     */
    isWorkflowEnabled(workflowId: string, spaceId: string): Promise<boolean>;
}
