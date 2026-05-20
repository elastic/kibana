import type { WorkflowYaml } from '@kbn/workflows';
import type { WorkflowProperties } from '../storage/workflow_storage';
export interface BulkFailureEntry {
    index: number;
    id: string;
    error: string;
}
export type IdSource = 'server-generated' | 'user-supplied';
export interface BulkWorkflowEntry {
    idx: number;
    id: string;
    idSource: IdSource;
    /**
     * Original base ID before the resolver appended any `-N` collision suffix.
     * Set for `server-generated` entries so the bulk write path can re-resolve
     * after a TOCTOU 409 without losing the original human-readable stem.
     * Equal to `id` for `user-supplied` entries.
     */
    baseId: string;
    workflowData: WorkflowProperties;
    definition?: WorkflowYaml;
}
export interface RemovalResult {
    kept: BulkWorkflowEntry[];
    removed: BulkFailureEntry[];
}
/**
 * Partitions workflows by ID source: server-generated vs user-supplied.
 * Pure function — does not mutate the input array.
 */
export declare const partitionByIdSource: (workflows: readonly BulkWorkflowEntry[]) => {
    serverGenerated: BulkWorkflowEntry[];
    userSupplied: BulkWorkflowEntry[];
};
/**
 * Removes workflows whose user-supplied ID already exists in the database.
 * Entries with `idSource: 'server-generated'` pass through unconditionally.
 * Pure function — does not mutate the input array.
 */
export declare const removeConflictingIds: (workflows: readonly BulkWorkflowEntry[], existingIds: ReadonlySet<string>) => RemovalResult;
/**
 * Deduplicates user-supplied IDs within a batch. First occurrence wins;
 * later duplicates are added to `removed`. Server-generated entries
 * (`idSource === 'server-generated'`) always pass through.
 * Pure function — does not mutate the input array.
 */
export declare const deduplicateUserIds: (workflows: readonly BulkWorkflowEntry[]) => RemovalResult;
