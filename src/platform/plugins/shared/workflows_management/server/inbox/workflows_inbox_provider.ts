/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type {
  InboxActionProvider,
  InboxActionProviderListParams,
  InboxActionProviderListResult,
  InboxRequestContext,
} from '@kbn/inbox-plugin/server';
import { parseWorkflowSourceId, toInboxAction } from './to_inbox_action';
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
      logger.debug(
        `Workflows inbox provider resuming execution ${parsed.executionId} (workflow ${parsed.workflowId})`
      );
      await api.resumeWorkflowExecution(parsed.executionId, ctx.spaceId, input, ctx.request);
    },
  };
};
