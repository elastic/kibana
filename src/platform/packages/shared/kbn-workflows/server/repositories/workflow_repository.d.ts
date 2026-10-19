import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EsWorkflow, WorkflowDetailDto } from '../..';
import type { ManagedFilter } from '../lib/workflow_filters';
export interface WorkflowRepositoryOptions {
    esClient: ElasticsearchClient;
    logger: Logger;
    indexName: string;
}
export type WorkflowRepositoryParams = Omit<WorkflowRepositoryOptions, 'indexName'> & {
    indexName?: string;
};
export interface WorkflowLookupOptions {
    includeGlobal?: boolean;
    managedFilter?: ManagedFilter;
}
/** How many workflows {@link WorkflowRepository.getWorkflowNames} reads in one request. */
export declare const WORKFLOW_NAMES_CHUNK_SIZE = 1000;
export declare class WorkflowRepository {
    private options;
    constructor(params: WorkflowRepositoryParams);
    /**
     * Get a workflow by ID and space ID
     */
    getWorkflow(workflowId: string, spaceId: string, options?: WorkflowLookupOptions & {
        includeDeleted?: boolean;
    }): Promise<EsWorkflow | null>;
    /**
     * Check if a workflow is enabled by ID and space ID
     */
    isWorkflowEnabled(workflowId: string, spaceId: string, options?: WorkflowLookupOptions): Promise<boolean>;
    /** Reads the enabled state from the translog after an execution becomes searchable. */
    isWorkflowEnabledRealtime(workflowId: string, spaceId: string): Promise<boolean>;
    /** Checks managed child eligibility in the execution space or global catalog without comparing revisions. */
    isManagedChildAdmissibleRealtime(workflowId: string, spaceId: string): Promise<boolean>;
    /**
     * Bulk-check whether the given (workflowId, spaceId) pairs refer to enabled,
     * non-soft-deleted workflows. Runs a single `_search` fetching only the
     * `enabled` field across all requested ids.
     *
     * When `options.includeGlobal` is `true`, a workflow stored in the global
     * space (`*`) is considered visible for each requested space and contributes
     * to that `${spaceId}:${workflowId}` result.
     *
     * The returned map is keyed by `${spaceId}:${workflowId}`. Missing docs and
     * soft-deleted docs (`deleted_at` present) resolve to `false`.
     */
    areWorkflowsEnabled(refs: Array<{
        workflowId: string;
        spaceId: string;
    }>, options?: WorkflowLookupOptions): Promise<Map<string, boolean>>;
    /** Loads current enabled state and ACLs in one query, with missing and deleted workflows disabled. */
    getWorkflowExecutionStates(refs: Array<{
        workflowId: string;
        spaceId: string;
    }>, options?: WorkflowLookupOptions): Promise<Map<string, Pick<EsWorkflow, 'enabled' | 'owner_id' | 'access_control'>>>;
    /**
     * Loads the names of workflows, keyed by `${spaceId}:${workflowId}`. Missing and soft-deleted
     * workflows are left out, and so is a workflow whose ID exists in another space than the one
     * asked for. Global workflows are not looked up, since they cannot be bound to a service account.
     *
     * Reads the workflows by ID in chunks of {@link WORKFLOW_NAMES_CHUNK_SIZE}, one after another,
     * and starts no further chunk once `signal` is aborted. Throws rather than return a partial
     * result when a document cannot be read.
     */
    getWorkflowNames(refs: ReadonlyArray<{
        workflowId: string;
        spaceId: string;
    }>, { signal }?: {
        signal?: AbortSignal;
    }): Promise<Map<string, string>>;
    /**
     * Returns all enabled, non-deleted workflows in the space that are subscribed to the given trigger type.
     * Uses PIT-based pagination to handle large result sets.
     */
    getWorkflowsSubscribedToTrigger(triggerId: string, spaceId: string): Promise<WorkflowDetailDto[]>;
}
