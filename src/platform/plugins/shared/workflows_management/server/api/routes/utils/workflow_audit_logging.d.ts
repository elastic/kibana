import type { KibanaRequest } from '@kbn/core-http-server';
import type { WorkflowsService } from '../../workflows_management_service';
/**
 * Stable action names for xpack.security.audit.ignore_filters.
 * Bulk create/delete APIs use dedicated actions (`workflow_bulk_*`) so operators can filter bulk
 * traffic without matching on message text.
 */
export declare const WorkflowManagementAuditActions: {
    readonly CREATE: "workflow_create";
    readonly BULK_CREATE: "workflow_bulk_create";
    readonly UPDATE: "workflow_update";
    readonly DELETE: "workflow_delete";
    readonly BULK_DELETE: "workflow_bulk_delete";
    readonly CLONE: "workflow_clone";
    readonly EXPORT: "workflow_export";
    readonly MGET: "workflow_mget";
    readonly GET: "workflow_get";
    readonly RUN: "workflow_run";
    readonly TEST: "workflow_test";
    readonly TEST_STEP: "workflow_test_step";
    readonly CANCEL_EXECUTION: "workflow_execution_cancel";
    readonly RESUME_EXECUTION: "workflow_execution_resume";
};
interface WorkflowManagementAuditLogDeps {
    service: WorkflowsService;
}
/**
 * Audit logger for workflow management.
 * Instantiated once with deps; each method takes only `request` + params.
 * Best-effort: sync throws are caught; audit never affects HTTP responses.
 */
export declare class WorkflowManagementAuditLog {
    private readonly deps;
    private security?;
    constructor(deps: WorkflowManagementAuditLogDeps);
    private log;
    logWorkflowCreated(request: KibanaRequest, params: {
        id: string;
        viaBulkImport?: boolean;
    }): void;
    logWorkflowCreateFailed(request: KibanaRequest, error: unknown, options?: {
        bulkOperation?: boolean;
    }): void;
    /**
     * One `workflow_bulk_create` audit per created workflow and per failed bulk row (bulk POST /api/workflows).
     */
    logBulkWorkflowCreateResults(request: KibanaRequest, params: {
        created: ReadonlyArray<{
            id: string;
        }>;
        failed: ReadonlyArray<{
            index: number;
            id: string;
            error: string;
        }>;
    }): void;
    logWorkflowUpdated(request: KibanaRequest, params: {
        id: string;
        error?: unknown;
    }): void;
    logWorkflowDeleted(request: KibanaRequest, params: {
        id: string;
        viaBulkDelete?: boolean;
        force?: boolean;
        error?: unknown;
    }): void;
    /**
     * One `workflow_bulk_delete` audit event per successfully removed id and per failed id (bulk API).
     */
    logBulkWorkflowDeleteResults(request: KibanaRequest, params: {
        successfulIds: readonly string[];
        failures: ReadonlyArray<{
            id: string;
            error: string;
        }>;
        force?: boolean;
    }): void;
    logBulkWorkflowDeleteFailed(request: KibanaRequest, error: unknown, options?: {
        force?: boolean;
    }): void;
    logWorkflowCloned(request: KibanaRequest, params: {
        sourceId: string;
        newId?: string;
        error?: unknown;
    }): void;
    /**
     * Export audit: one `workflow_export` event per id on success; a single failure event when `error` is set.
     */
    logWorkflowsExported(request: KibanaRequest, params: {
        ids?: readonly string[];
        error?: unknown;
    }): void;
    logWorkflowAccessed(request: KibanaRequest, params: {
        id: string;
        error?: unknown;
    }): void;
    logWorkflowMget(request: KibanaRequest, params: {
        requestedCount?: number;
        returnedCount?: number;
        error?: unknown;
    }): void;
    logWorkflowRun(request: KibanaRequest, params: {
        workflowId: string;
        executionId?: string;
        error?: unknown;
    }): void;
    logWorkflowTest(request: KibanaRequest, params: {
        workflowExecutionId: string;
        workflowId?: string;
        error?: unknown;
    }): void;
    logWorkflowStepTest(request: KibanaRequest, params: {
        stepId: string;
        workflowExecutionId: string;
        workflowId?: string;
        error?: unknown;
    }): void;
    logExecutionCanceled(request: KibanaRequest, params: {
        executionId: string;
        error?: unknown;
    }): void;
    logExecutionResumed(request: KibanaRequest, params: {
        executionId: string;
        error?: unknown;
        /** Present on success; mirrors execution context written by the engine. */
        resumedBy?: string;
    }): void;
}
export {};
