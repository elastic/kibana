import type { KibanaRequest } from '@kbn/core/server';
import type { CreateWorkflowCommand, EsWorkflow, UpdatedWorkflowResponseDto, WorkflowDetailDto, WorkflowYaml } from '@kbn/workflows';
import type { WorkflowPartialDetailDto } from '@kbn/workflows/types/v1';
import type { WorkflowCrudDeps } from './types';
import type { DeleteWorkflowsResponse } from '../api/workflows_management_api';
import type { BulkFailureEntry } from '../lib/bulk_id_helpers';
import type { WorkflowProperties } from '../storage/workflow_storage';
export interface VersionedWorkflowDocument {
    source: WorkflowProperties;
    seqNo: number;
    primaryTerm: number;
}
export interface IndexWorkflowDocumentOptions {
    create?: boolean;
    ifPrimaryTerm?: number;
    ifSeqNo?: number;
}
export declare class WorkflowCrudService {
    private readonly deps;
    constructor(deps: WorkflowCrudDeps);
    getWorkflowDocumentSource(id: string, spaceId: string, options?: {
        includeDeleted?: boolean;
        includeGlobal?: boolean;
    }): Promise<WorkflowProperties | null>;
    getWorkflowDocumentWithVersion(id: string, spaceId: string, options?: {
        includeDeleted?: boolean;
        includeGlobal?: boolean;
    }): Promise<VersionedWorkflowDocument | null>;
    indexWorkflowDocument(id: string, document: WorkflowProperties, options?: IndexWorkflowDocumentOptions): Promise<void>;
    prepareWorkflowDocumentForStorage(params: {
        actor: string;
        id?: string;
        now: Date;
        spaceId: string;
        request?: KibanaRequest;
        yaml: string;
    }): Promise<{
        id: string;
        workflowData: WorkflowProperties;
        definition?: WorkflowYaml;
    }>;
    getManagedWorkflowDocuments(spaceId: string, options?: {
        includeDeleted?: boolean;
    }): Promise<Array<{
        id: string;
        source: WorkflowProperties;
    }>>;
    getManagedWorkflowDocumentsAllSpaces(options?: {
        includeDeleted?: boolean;
        pluginId?: string;
    }): Promise<Array<{
        id: string;
        source: WorkflowProperties;
    }>>;
    getWorkflow(id: string, spaceId: string, options?: {
        includeDeleted?: boolean;
    }): Promise<WorkflowDetailDto | null>;
    getWorkflowsByIds(ids: string[], spaceId: string, options?: {
        includeDeleted?: boolean;
        includeGlobal?: boolean;
    }): Promise<WorkflowDetailDto[]>;
    getWorkflowsSourceByIds(ids: string[], spaceId: string, source?: string[], options?: {
        includeDeleted?: boolean;
        includeGlobal?: boolean;
    }): Promise<WorkflowPartialDetailDto[]>;
    createWorkflow(workflow: CreateWorkflowCommand, spaceId: string, request: KibanaRequest): Promise<WorkflowDetailDto>;
    bulkCreateWorkflows(workflows: CreateWorkflowCommand[], spaceId: string, request: KibanaRequest, options?: {
        overwrite?: boolean;
    }): Promise<{
        created: WorkflowDetailDto[];
        failed: BulkFailureEntry[];
    }>;
    updateWorkflow(id: string, workflow: Partial<EsWorkflow>, spaceId: string, request: KibanaRequest): Promise<UpdatedWorkflowResponseDto>;
    deleteWorkflows(ids: string[], spaceId: string, options?: {
        force?: boolean;
    }): Promise<DeleteWorkflowsResponse>;
    disableAllWorkflows(spaceId?: string): Promise<{
        total: number;
        disabled: number;
        failures: Array<{
            id: string;
            error: string;
        }>;
    }>;
    private getEsWorkflowForScheduler;
    private getExistingWorkflowDocument;
    private resolveAndDeduplicateBulkIds;
    /**
     * Indexes a new workflow with `op_type: 'create'` so that ES rejects the write
     * with a 409 if another concurrent caller has already taken `_id` since our
     * collision check ran. This closes the TOCTOU window between
     * `resolveUniqueWorkflowIds`/`checkExistingIds` and `index()`.
     *
     * Behavior on conflict:
     * - User-supplied ID: surface a `WorkflowConflictError` (the user picked the ID,
     *   so silently rewriting it would violate caller expectations).
     * - Server-generated ID: re-resolve from the original `baseId` and retry.
     *   The resolver picks the next available `baseId-N` candidate, so the human
     *   readability of the ID is preserved.
     */
    private createWorkflowDocument;
    /**
     * Checks which of the given candidate IDs already exist in the workflow index.
     * The lookup is intentionally:
     *
     * - **Index-wide (no `spaceId` filter)**: workflow IDs are surfaced to users as
     *   "human-readable IDs", so they must stay globally unique. The ES `_id` is
     *   unique per index regardless of the document's `spaceId` field, so this
     *   query matches the index's real uniqueness boundary. A document with the
     *   same `_id` in any space — even one the caller cannot read — would still
     *   collide on write.
     * - **Inclusive of soft-deleted documents (tombstones)**: the `ids` query
     *   matches purely by `_id`, which is preserved on soft-delete. We rely on
     *   that here: re-using the ID of a soft-deleted workflow would (a) silently
     *   resurrect the tombstone or (b) be rejected by `op_type: 'create'`, both
     *   of which are wrong for a "globally unique human-readable ID" contract.
     */
    private checkExistingIds;
}
