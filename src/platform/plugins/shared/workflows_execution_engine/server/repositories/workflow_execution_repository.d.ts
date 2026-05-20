import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
export declare class WorkflowExecutionRepository {
    private esClient;
    private indexName;
    constructor(esClient: ElasticsearchClient);
    /**
     * Retrieves a workflow execution by its ID from Elasticsearch.
     *
     * Uses direct document GET by _id for O(1) lookup performance instead of search.
     * This is critical for high-frequency operations like cancel polling.
     *
     * @param workflowExecutionId - The ID of the workflow execution to retrieve.
     * @param spaceId - The ID of the space associated with the workflow execution.
     * @returns A promise that resolves to the workflow execution document, or null if not found.
     */
    getWorkflowExecutionById(workflowExecutionId: string, spaceId: string): Promise<EsWorkflowExecution | null>;
    /**
     * Creates a new workflow execution document in Elasticsearch.
     *
     * @param workflowExecution - A partial object representing the workflow execution to be created.
     * @param options - Optional settings for the create operation.
     * @param options.refresh - Whether to refresh the index after writing. Use 'wait_for' when
     *                          immediate searchability is required (e.g., for deduplication checks).
     *                          Defaults to false for better performance.
     * @returns A promise that resolves when the workflow execution has been indexed.
     */
    createWorkflowExecution(workflowExecution: Partial<EsWorkflowExecution>, options?: {
        refresh?: boolean | 'wait_for';
    }): Promise<void>;
    /**
     * Bulk creates multiple workflow execution documents in a single Elasticsearch request.
     * Per-doc errors are reported per item in input order instead of throwing.
     *
     * @param executions - Array of partial workflow execution objects. Each must include the `id` property.
     * @param options.refresh - Same semantics as `createWorkflowExecution`.
     * @throws {Error} If any execution ID is missing.
     * @returns Per-item results in the same order as `executions`.
     */
    bulkCreateWorkflowExecutions(executions: Array<Partial<EsWorkflowExecution>>, options?: {
        refresh?: boolean | 'wait_for';
    }): Promise<Array<{
        id: string;
    } | {
        id: string;
        error: string;
    }>>;
    /**
     * Partially updates an existing workflow execution in Elasticsearch.
     *
     * This method requires the `id` property to be present in the `workflowExecution` object.
     * If the `id` is missing, an error is thrown.
     * The update operation is performed using the Elasticsearch client with refresh: false for better performance.
     * The document will be searchable after the next index refresh (typically within 1 second).
     *
     * @param workflowExecution - A partial object representing the workflow execution to update. Must include the `id` property.
     * @throws {Error} If the `id` property is not provided in the `workflowExecution` object.
     * @returns A promise that resolves when the update operation is complete.
     */
    updateWorkflowExecution(workflowExecution: Partial<EsWorkflowExecution>): Promise<void>;
    /**
     * Bulk updates multiple workflow executions in a single Elasticsearch request.
     * This is more efficient than individual updates, especially when cancelling multiple executions.
     *
     * @param updates - Array of partial workflow execution objects. Each must include the `id` property.
     * @throws {Error} If any execution ID is missing or if the bulk operation has errors.
     * @returns A promise that resolves when all updates are complete.
     */
    bulkUpdateWorkflowExecutions(updates: Array<Partial<EsWorkflowExecution>>): Promise<void>;
    /**
     * Generic method to search workflow executions with a custom query.
     *
     * @param query - The Elasticsearch query object.
     * @param size - Optional maximum number of results to return (default: 10).
     * @returns A promise that resolves to the list of search hits.
     */
    searchWorkflowExecutions(query: Record<string, unknown>, size?: number): Promise<estypes.SearchHit<EsWorkflowExecution>[]>;
    /**
     * Checks if there are any running (non-terminal) workflow executions for a workflow ID.
     *
     * Optimized query using:
     * - filter context (no scoring) instead of must (faster)
     * - direct status match instead of must_not exclusion (more efficient)
     * - terminate_after: 1 to stop scanning after finding one match
     * - size: 0 to avoid fetching document source
     * - _source: false to avoid fetching any document content
     *
     * @param workflowId - The ID of the workflow.
     * @param spaceId - The ID of the space associated with the workflow execution.
     * @param triggeredBy - Optional filter for the trigger type (e.g., 'scheduled').
     * @returns A promise that resolves to true if there's a running execution, false otherwise.
     */
    hasRunningExecution(workflowId: string, spaceId: string, triggeredBy?: string): Promise<boolean>;
    /**
     * Retrieves running (non-terminal) workflow executions by workflow ID.
     *
     * Uses the same optimized query structure as hasRunningExecution() but returns the actual hits.
     *
     * @param workflowId - The ID of the workflow.
     * @param spaceId - The ID of the space associated with the workflow execution.
     * @param triggeredBy - Optional filter for the trigger type (e.g., 'scheduled').
     * @returns A promise that resolves to the list of search hits for running executions.
     */
    getRunningExecutionsByWorkflowId(workflowId: string, spaceId: string, triggeredBy?: string): Promise<estypes.SearchHit<EsWorkflowExecution>[]>;
    /**
     * Retrieves non-terminal workflow execution IDs by concurrency group key.
     * For cancel-in-progress strategy, we need to cancel any non-terminal executions (PENDING, RUNNING, etc.)
     * to make room for new executions.
     *
     * Only returns execution IDs (not full documents) for efficiency, as we only need IDs for cancellation.
     * Results are sorted by createdAt ascending (oldest first).
     *
     * @param concurrencyGroupKey - The concurrency group key to filter by.
     * @param spaceId - The ID of the space associated with the workflow execution.
     * @param excludeExecutionId - Optional execution ID to exclude from results (e.g., current execution).
     * @param size - Optional limit on the number of results to return. Defaults to 5000.
     * @returns A promise that resolves to an array of execution IDs sorted by createdAt (oldest first).
     */
    getRunningExecutionsByConcurrencyGroup(concurrencyGroupKey: string, spaceId: string, excludeExecutionId?: string, size?: number): Promise<string[]>;
    /**
     * One page of non-terminal workflow execution IDs for a workflow in a space, using
     * search_after on the executions index (no point-in-time). Callers page by passing
     * nextSearchAfter from the previous response. Under concurrent index changes, pagination
     * is not a strict snapshot (possible duplicates or gaps across pages).
     */
    findNonTerminalExecutionIdsByWorkflowIdPage({ spaceId, workflowId, size, searchAfter, }: {
        spaceId: string;
        workflowId: string;
        size: number;
        searchAfter?: estypes.SortResults;
    }): Promise<{
        results: string[];
        total: number;
        nextSearchAfter?: estypes.SortResults;
    }>;
}
