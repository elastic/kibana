import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EsWorkflowStepExecution } from '@kbn/workflows';
export interface StepExecutionListResult {
    results: EsWorkflowStepExecution[];
    total: number;
    page?: number;
    size?: number;
}
export interface SearchStepExecutionsParams {
    esClient: ElasticsearchClient;
    logger: Logger;
    stepsExecutionIndex: string;
    /** When set, search steps for a single workflow run (existing behavior). */
    workflowExecutionId?: string;
    /** When set, search steps across all runs of a workflow. Use with optional stepId. */
    workflowId?: string;
    stepId?: string;
    additionalQuery?: estypes.QueryDslQueryContainer;
    spaceId: string;
    sourceExcludes?: string[];
    page?: number;
    size?: number;
}
export declare const searchStepExecutions: ({ esClient, logger, stepsExecutionIndex, workflowExecutionId, workflowId, stepId, additionalQuery, spaceId, sourceExcludes, page, size, }: SearchStepExecutionsParams) => Promise<StepExecutionListResult>;
