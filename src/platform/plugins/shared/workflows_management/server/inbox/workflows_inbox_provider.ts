/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import {
  createInboxActionConflictError,
  createInvalidInboxActionSourceIdError,
  type InboxActionProvider,
  type InboxActionProviderFacetsResult,
  type InboxActionProviderListParams,
  type InboxActionProviderListProcessedParams,
  type InboxActionProviderListResult,
  type InboxRequestContext,
} from '@kbn/inbox-plugin/server';
import { ExecutionStatus } from '@kbn/workflows';
import {
  buildWorkflowSourceId,
  parseWorkflowSourceId,
  toInboxAction,
  toInboxHistoryAction,
} from './to_inbox_action';
import type { WorkflowManagementAuditLog } from '../api/routes/utils/workflow_audit_logging';
import type { WorkflowsManagementApi } from '../api/workflows_management_api';

export const WORKFLOWS_INBOX_SOURCE_APP = 'workflows' as const;

export interface CreateWorkflowsInboxProviderArgs {
  api: WorkflowsManagementApi;
  logger: Logger;
  /** Same instance as HTTP routes — inbox resume must emit identical security audit events. */
  audit: WorkflowManagementAuditLog;
  /**
   * Fallback slice size for direct provider calls. The Inbox registry passes
   * an explicit `perPage` sized to the requested merged page.
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
export const createWorkflowsInboxProvider = ({
  api,
  logger,
  audit,
  pageSize = 1000,
}: CreateWorkflowsInboxProviderArgs): InboxActionProvider => {
  return {
    sourceApp: WORKFLOWS_INBOX_SOURCE_APP,

    async list(
      params: InboxActionProviderListParams,
      ctx: InboxRequestContext
    ): Promise<InboxActionProviderListResult> {
      const { results, total, reasoningByStepId } = await api.listWaitingForInputSteps(
        ctx.spaceId,
        {
          page: params.page ?? 1,
          perPage: params.perPage ?? pageSize,
        }
      );

      return {
        actions: results.map((step) => toInboxAction(step, reasoningByStepId.get(step.id))),
        total,
      };
    },

    async listProcessed(
      params: InboxActionProviderListProcessedParams,
      ctx: InboxRequestContext
    ): Promise<InboxActionProviderListResult> {
      const { results, total, reasoningByStepId, deletedWorkflowIds } =
        await api.listProcessedWaitForInputSteps(ctx.spaceId, {
          page: params.page ?? 1,
          perPage: params.perPage ?? pageSize,
          // Push the filter dimensions the workflows step-exec index can
          // answer with native predicates straight down to the query service.
          q: params.q,
          channel: params.channel,
          workflowId: params.workflowId,
          respondedBy: params.respondedBy,
          sortOrder: params.sortOrder,
        });

      return {
        actions: results.map((step) =>
          toInboxHistoryAction(step, reasoningByStepId.get(step.id), {
            workflowDeleted: step.workflowId ? deletedWorkflowIds.has(step.workflowId) : false,
          })
        ),
        total,
      };
    },

    async listProcessedFacets(ctx: InboxRequestContext): Promise<InboxActionProviderFacetsResult> {
      // The query service computes facets against the same baseline scope as
      // the listing (space + waitForInput + terminated-or-audit-stamped) but
      // skips user-supplied filter clauses on purpose. See
      // `listProcessedWaitForInputFacets` for the stability rationale.
      const { channel, respondedBy } = await api.listProcessedWaitForInputFacets(ctx.spaceId);
      return { channel, respondedBy };
    },

    async respond(
      sourceId: string,
      input: Record<string, unknown>,
      ctx: InboxRequestContext
    ): Promise<void> {
      const parsed = parseWorkflowSourceId(sourceId);
      if (!parsed) {
        throw createInvalidInboxActionSourceIdError(
          WORKFLOWS_INBOX_SOURCE_APP,
          sourceId,
          'workflowId:workflowRunId:stepExecutionId'
        );
      }

      // The engine's `resumeWorkflowExecution` only validates the
      // execution-level status, not which step is currently waiting. That
      // is unsafe in two ways:
      //   1. A response composed against a stale inbox listing can land
      //      after the originally-targeted step has been advanced and a
      //      *later* `waitForInput` is now blocking — the engine would
      //      silently apply the input to that unrelated later step.
      //   2. Two near-simultaneous responses to the same step both pass
      //      the workflow-level check; without a step-level claim, one
      //      input could be dropped with no error surfaced to either client.
      // We mitigate (1) here by re-reading the targeted step doc and
      // refusing to forward unless it is still the one waiting. We mitigate
      // (2) below by using `markStepAsResponded` as a first-writer-wins
      // claim before scheduling the resume.
      const stepExecution = await api.getStepExecution(
        { executionId: parsed.executionId, id: parsed.stepExecutionId },
        ctx.spaceId
      );

      if (!stepExecution) {
        throw createInboxActionConflictError(
          WORKFLOWS_INBOX_SOURCE_APP,
          sourceId,
          `step execution ${parsed.stepExecutionId} not found in space ${ctx.spaceId}`
        );
      }

      if (stepExecution.status !== ExecutionStatus.WAITING_FOR_INPUT) {
        throw createInboxActionConflictError(
          WORKFLOWS_INBOX_SOURCE_APP,
          buildWorkflowSourceId(stepExecution),
          `step execution ${parsed.stepExecutionId} is in status "${stepExecution.status}", expected "${ExecutionStatus.WAITING_FOR_INPUT}"`
        );
      }

      // Defence-in-depth: a race between the workflow-level timeout monitor
      // and the waitForInput step can leave a doc with
      // `status: waiting_for_input` AND `finishedAt`/`error` set. The status
      // check above then passes, but the step is actually terminal. Translate
      // this to a clean 409 here so responders see a meaningful message
      // instead of a 500 from the engine's freshness check.
      if (stepExecution.finishedAt || stepExecution.error) {
        throw createInboxActionConflictError(
          WORKFLOWS_INBOX_SOURCE_APP,
          buildWorkflowSourceId(stepExecution),
          `step execution ${parsed.stepExecutionId} is already settled (finishedAt=${
            stepExecution.finishedAt ?? 'unset'
          }${stepExecution.error ? `, error=${stepExecution.error.type}` : ''})`
        );
      }

      // Audit-stamp the step doc *before* scheduling the resume so the
      // "responded but not yet resumed" window is observable to every
      // client (Kibana inbox, Slack, agent builder, raw API). Doing this
      // first is intentional: if the audit write succeeds and the
      // resume schedule fails, the next list pass will surface a step
      // with `respondedAt` set but still in `WAITING_FOR_INPUT` — the
      // engine timeout monitor / a manual retry can then drive it
      // forward. The reverse ordering would let a responder see "no
      // change" on a successful resume that beat its own audit write.
      // `ctx.channel` is set by the inbox respond route from the request
      // body's slug-validated field; it falls back to `'inbox'` when the
      // caller (e.g. the in-product Kibana inbox UI) doesn't explicitly
      // identify itself, preserving pre-existing audit semantics. Non-UI
      // clients (MCP, Slack bot, agent builder) tag their channel
      // explicitly so the audit feed can render "via …" attribution.
      const channel = ctx.channel ?? 'inbox';
      let didMarkStep: boolean;
      try {
        didMarkStep = await api.markStepAsResponded(
          parsed.stepExecutionId,
          ctx.request,
          channel,
          ctx.spaceId
        );
      } catch (error) {
        logger.error(
          `Workflows inbox provider failed to mark step ${parsed.stepExecutionId} as responded; aborting resume: ${error}`
        );
        throw error;
      }
      if (!didMarkStep) {
        throw createInboxActionConflictError(
          WORKFLOWS_INBOX_SOURCE_APP,
          sourceId,
          `step execution ${parsed.stepExecutionId} was already claimed or no longer exists`
        );
      }

      logger.debug(
        `Workflows inbox provider resuming execution ${parsed.executionId} (workflow ${parsed.workflowId})`
      );
      try {
        const { resumedBy } = await api.resumeWorkflowExecution(
          parsed.executionId,
          ctx.spaceId,
          input,
          ctx.request
        );
        audit.logExecutionResumed(ctx.request, {
          executionId: parsed.executionId,
          resumedBy,
        });
      } catch (error) {
        audit.logExecutionResumed(ctx.request, {
          executionId: parsed.executionId,
          error,
        });
        throw error;
      }
    },
  };
};
