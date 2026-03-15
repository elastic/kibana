/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { WorkflowDetailDto } from '@kbn/workflows';
import { workflowMatchesTriggerCondition } from './filter_workflows_by_trigger_condition';
import type { WorkflowsManagementApi } from '../workflows_management/workflows_management_api';

export interface ResolveMatchingWorkflowSubscriptionsParams {
  triggerId: string;
  spaceId: string;
  eventContext: Record<string, unknown>;
}

export interface ResolveMatchingWorkflowSubscriptionsDeps {
  api: Pick<WorkflowsManagementApi, 'getWorkflowsSubscribedToTrigger'>;
  logger: Logger;
}

/**
 * Resolves workflows that are subscribed to the given trigger and whose trigger
 * condition matches the event context.
 */
export async function resolveMatchingWorkflowSubscriptions(
  params: ResolveMatchingWorkflowSubscriptionsParams,
  deps: ResolveMatchingWorkflowSubscriptionsDeps
): Promise<WorkflowDetailDto[]> {
  const { triggerId, spaceId, eventContext } = params;
  const allWorkflows = await deps.api.getWorkflowsSubscribedToTrigger(triggerId, spaceId);
  return allWorkflows.filter(
    (w) => w.enabled && workflowMatchesTriggerCondition(w, triggerId, eventContext, deps.logger)
  );
}
