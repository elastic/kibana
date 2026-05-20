import type { InboxAction } from '@kbn/inbox-common';
import type { EsWorkflowStepExecution } from '@kbn/workflows';
/**
 * Composite identifier that makes a Workflows step execution uniquely
 * addressable within the Inbox. Format: `workflowId:workflowRunId:stepExecutionId`.
 * The `workflowRunId` is what the `resume` API needs, and the `id` (step
 * execution doc id) is retained for traceability / future sub-workflow
 * propagation work per [security-team#16710](https://github.com/elastic/security-team/issues/16710).
 */
export declare const buildWorkflowSourceId: (step: EsWorkflowStepExecution) => string;
/**
 * Extracts the `workflowRunId` (a.k.a. executionId) from a composite source id.
 * Returns `null` if the source id is malformed — the route handler treats
 * that as a 404.
 */
export declare const parseWorkflowSourceId: (sourceId: string) => {
    workflowId: string;
    executionId: string;
    stepExecutionId: string;
} | null;
/**
 * Maps a paused `waitForInput` step execution to the common {@link InboxAction}
 * shape. Pure function, no plugin deps — safe to unit test in isolation.
 *
 * Aligned with HITL GA [security-team#16707](https://github.com/elastic/security-team/issues/16707) (schema-driven form):
 * we surface `input.message` as the responder's prompt and `input.schema` as
 * the shape the response must conform to.
 */
export declare const toInboxAction: (step: EsWorkflowStepExecution) => InboxAction;
