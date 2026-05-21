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
  type InboxActionProvider,
  type InboxActionProviderListParams,
  type InboxActionProviderListResult,
  type InboxRequestContext,
} from '@kbn/inbox-plugin/server';
import { ExecutionStatus } from '@kbn/workflows';
import { buildWorkflowSourceId, parseWorkflowSourceId, toInboxAction } from './to_inbox_action';
import type { WorkflowManagementAuditLog } from '../api/routes/utils/workflow_audit_logging';
import type { WorkflowsManagementApi } from '../api/workflows_management_api';

export const WORKFLOWS_INBOX_SOURCE_APP = 'workflows' as const;

export class InvalidWorkflowSourceIdError extends Error {
  constructor(public readonly sourceId: string) {
    super(
      `Workflows inbox provider received an unparseable source_id "${sourceId}". ` +
        `Expected format: workflowId:workflowRunId:stepExecutionId.`
    );
    this.name = 'InvalidWorkflowSourceIdError';
  }
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
export const createWorkflowsInboxProvider = ({
  api,
  logger,
  audit,
  pageSize = 1000,
}: CreateWorkflowsInboxProviderArgs): InboxActionProvider => {
  return {
    sourceApp: WORKFLOWS_INBOX_SOURCE_APP,

    async list(
      _params: InboxActionProviderListParams,
      ctx: InboxRequestContext
    ): Promise<InboxActionProviderListResult> {
      const { results, total } = await api.listWaitingForInputSteps(ctx.spaceId, {
        page: 1,
        perPage: pageSize,
      });

      return {
        actions: results.map(toInboxAction),
        total,
      };
    },

    async respond(
      sourceId: string,
      input: Record<string, unknown>,
      ctx: InboxRequestContext
    ): Promise<void> {
      const parsed = parseWorkflowSourceId(sourceId);
      if (!parsed) {
        throw new InvalidWorkflowSourceIdError(sourceId);
      }

      // The engine's `resumeWorkflowExecution` only validates the
      // execution-level status, not which step is currently waiting. That
      // is unsafe in two ways:
      //   1. A response composed against a stale inbox listing can land
      //      after the originally-targeted step has been advanced and a
      //      *later* `waitForInput` is now blocking — the engine would
      //      silently apply the input to that unrelated later step.
      //   2. Two near-simultaneous responses to the same step both pass
      //      the workflow-level check; one input gets dropped on the
      //      floor with no error surfaced to either client.
      // We mitigate (1) here by re-reading the targeted step doc and
      // refusing to forward unless it is still the one waiting. (2)
      // requires server-side optimistic concurrency on the workflows
      // execution doc — tracked as a follow-up against the workflows
      // team since it lives outside our ownership boundary.
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
