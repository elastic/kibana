import type { ElasticsearchClient } from '@kbn/core/server';
import type { EsWorkflowStepExecution } from '@kbn/workflows';
export type StepExecutionField = keyof EsWorkflowStepExecution;
export declare class StepExecutionRepository {
    private esClient;
    private indexName;
    constructor(esClient: ElasticsearchClient);
    /**
     * Searches for step executions by workflow execution ID.
     *
     * @param executionId - The ID of the workflow execution to search for step executions.
     * @returns A promise that resolves to an array of step executions associated with the given execution ID.
     */
    searchStepExecutionsByExecutionId(executionId: string): Promise<EsWorkflowStepExecution[]>;
    /**
     * Fetches all step executions for a workflow execution.
     * Uses mget (real-time, O(1)) when stepExecutionIds are available,
     * falls back to search for backward compatibility with older executions.
     */
    getStepExecutionsByWorkflowExecution(workflowExecutionId: string, stepExecutionIds?: string[]): Promise<EsWorkflowStepExecution[]>;
    getStepExecutionsByIds(stepExecutionIds: string[], sourceIncludes?: StepExecutionField[], sourceExcludes?: StepExecutionField[]): Promise<EsWorkflowStepExecution[]>;
    bulkUpsert(stepExecutions: Array<Partial<EsWorkflowStepExecution>>): Promise<void>;
}
