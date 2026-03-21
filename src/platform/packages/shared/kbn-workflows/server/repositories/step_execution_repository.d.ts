import type { ElasticsearchClient } from '@kbn/core/server';
import type { EsWorkflowStepExecution } from '../../types/v1';
/**
 * Fetches step executions by their IDs using mget (O(1) operation).
 * This is real-time (reads from translog) and doesn't require index refresh.
 */
export declare const getStepExecutionsByIds: (esClient: ElasticsearchClient, stepsExecutionIndex: string, stepExecutionIds: string[], sourceExcludes?: string[]) => Promise<EsWorkflowStepExecution[]>;
interface GetStepExecutionsByWorkflowExecutionParams {
    esClient: ElasticsearchClient;
    stepsExecutionIndex: string;
    workflowExecutionId: string;
    stepExecutionIds?: string[];
    sourceExcludes?: string[];
}
/**
 * Fetches all step executions for a workflow execution.
 * Uses mget (real-time, O(1)) when stepExecutionIds are available,
 * falls back to search for backward compatibility with older executions.
 */
export declare const getStepExecutionsByWorkflowExecution: ({ esClient, stepsExecutionIndex, workflowExecutionId, stepExecutionIds, sourceExcludes, }: GetStepExecutionsByWorkflowExecutionParams) => Promise<EsWorkflowStepExecution[]>;
export {};
