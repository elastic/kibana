import type { Logger } from '@kbn/core/server';
import { type InboxActionProvider } from '@kbn/inbox-plugin/server';
import type { WorkflowManagementAuditLog } from '../api/routes/utils/workflow_audit_logging';
import type { WorkflowsManagementApi } from '../api/workflows_management_api';
export declare const WORKFLOWS_INBOX_SOURCE_APP: "workflows";
export declare class InvalidWorkflowSourceIdError extends Error {
    readonly sourceId: string;
    constructor(sourceId: string);
}
export interface CreateWorkflowsInboxProviderArgs {
    api: WorkflowsManagementApi;
    logger: Logger;
    /** Same instance as HTTP routes — inbox resume must emit identical security audit events. */
    audit: WorkflowManagementAuditLog;
    /**
     * Upper bound on rows the registry hands us per `list()`. Phase 1 leans on
     * the registry's own pagination; we ask the service for a generous slice
     * and let the registry merge-sort + paginate downstream.
     */
    pageSize?: number;
}
/**
 * Workflows-side {@link InboxActionProvider}. Pure HITL — emits one
 * {@link InboxAction} per step execution currently blocked on `waitForInput`.
 *
 * Aligned with HITL GA epic [security-team#16706](https://github.com/elastic/security-team/issues/16706):
 * the provider does NOT promote prior-step output into source-specific
 * "proposal" payloads. Workflow authors who need to surface context to the
 * responder embed it in the `waitForInput.with.message` template.
 */
export declare const createWorkflowsInboxProvider: ({ api, logger, audit, pageSize, }: CreateWorkflowsInboxProviderArgs) => InboxActionProvider;
