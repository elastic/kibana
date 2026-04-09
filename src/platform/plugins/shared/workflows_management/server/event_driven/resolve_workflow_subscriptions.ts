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
import { classifyWorkflowTriggerMatch } from './filter_workflows_by_trigger_condition';
import { createEmptyTriggerResolutionStats } from './trigger_event_stats';
import type { WorkflowsManagementApi } from '../api/workflows_management_api';

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
 * Counts along the subscription → match funnel for one emit.
 */
export interface TriggerResolutionStats {
  /** Workflows returned by getWorkflowsSubscribedToTrigger */
  subscribedCount: number;
  /** Subscribed but workflow.disabled */
  disabledCount: number;
  /** Enabled, KQL present, evaluation is false */
  kqlFalseCount: number;
  /** Enabled, KQL threw during evaluation */
  kqlErrorCount: number;
  /** Enabled and condition passes (same as workflows.length in the result) */
  matchedCount: number;
}

export interface ResolveMatchingWorkflowSubscriptionsResult {
  workflows: WorkflowDetailDto[];
  stats: TriggerResolutionStats;
}

/**
 * Resolves workflows that are subscribed to the given trigger and whose trigger
 * condition matches the event context. Also returns funnel statistics.
 */
export async function resolveMatchingWorkflowSubscriptions(
  params: ResolveMatchingWorkflowSubscriptionsParams,
  deps: ResolveMatchingWorkflowSubscriptionsDeps
): Promise<ResolveMatchingWorkflowSubscriptionsResult> {
  const { triggerId, spaceId, eventContext } = params;
  const allWorkflows = await deps.api.getWorkflowsSubscribedToTrigger(triggerId, spaceId);

  const stats = createEmptyTriggerResolutionStats();
  stats.subscribedCount = allWorkflows.length;

  const workflows: WorkflowDetailDto[] = [];

  for (const workflow of allWorkflows) {
    const outcome = classifyWorkflowTriggerMatch(workflow, triggerId, eventContext, deps.logger);
    switch (outcome) {
      case 'disabled':
        stats.disabledCount += 1;
        break;
      case 'kql_false':
        stats.kqlFalseCount += 1;
        break;
      case 'kql_error':
        stats.kqlErrorCount += 1;
        break;
      case 'matched':
        stats.matchedCount += 1;
        workflows.push(workflow);
        break;
    }
  }

  return { workflows, stats };
}
