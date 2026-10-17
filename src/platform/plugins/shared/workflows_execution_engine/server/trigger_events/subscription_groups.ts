/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { evaluateKql } from '@kbn/eval-kql';
import { ALL_CONNECTOR_IDS, type WorkflowDetailDto } from '@kbn/workflows';
import {
  listTriggersOfType,
  readTriggerCondition,
  readYamlConnectorId,
} from './filter_workflows_by_trigger_condition';
import type { SubscriptionCacheGroup } from './subscription_resolution_cache';
import {
  createEmptyTriggerResolutionStats,
  type TriggerResolutionStats,
} from './trigger_event_stats';

type ConditionVerdict = 'matched' | 'kql_false' | 'kql_error';

/**
 * Groups enabled subscribers by the condition string used for this trigger.
 * Connector triggers also split on `connector-id`, keeping the first block per connector.
 */
export const groupSubscribedWorkflows = (
  workflows: readonly WorkflowDetailDto[],
  triggerId: string,
  requiresConnectorId: boolean
): SubscriptionCacheGroup[] => {
  const groups: Array<{ condition: string; workflowIds: string[]; connectorId?: string }> = [];
  const indexByKey = new Map<string, number>();

  const add = (workflowId: string, condition: string, connectorId?: string) => {
    const key = connectorId === undefined ? condition : `${connectorId}\0${condition}`;
    const existingIndex = indexByKey.get(key);
    if (existingIndex !== undefined) {
      groups[existingIndex].workflowIds.push(workflowId);
      return;
    }
    indexByKey.set(key, groups.length);
    groups.push({
      condition,
      workflowIds: [workflowId],
      ...(connectorId !== undefined ? { connectorId } : {}),
    });
  };

  for (const workflow of workflows.filter((item) => item.enabled)) {
    const blocks = listTriggersOfType(workflow.definition?.triggers, triggerId);
    if (!requiresConnectorId) {
      const first = blocks[0];
      if (first) {
        add(workflow.id, readTriggerCondition(first));
      }
    } else {
      const seenConnectors = new Set<string>();
      for (const block of blocks) {
        const connectorId = readYamlConnectorId(block);
        if (connectorId !== '' && !seenConnectors.has(connectorId)) {
          seenConnectors.add(connectorId);
          add(workflow.id, readTriggerCondition(block), connectorId);
        }
      }
    }
  }

  return groups;
};

export interface MatchSubscriptionGroupsParams {
  groups: readonly SubscriptionCacheGroup[];
  event: Record<string, unknown>;
  requiresConnectorId: boolean;
  logger?: Logger;
  triggerId: string;
}

/**
 * Evaluates each distinct condition string once and returns the workflow ids that match.
 * An exact `connector-id` hides `*` for that workflow.
 */
export const matchSubscriptionGroups = (
  params: MatchSubscriptionGroupsParams
): { matchedIds: string[]; stats: TriggerResolutionStats } => {
  const { groups, event, requiresConnectorId, logger, triggerId } = params;
  const stats = createEmptyTriggerResolutionStats();
  const selected = selectWorkflowConditions(groups, event, requiresConnectorId);
  stats.subscribedCount = selected.orderedIds.length;
  stats.connectorIdMismatchCount = selected.mismatchIds.length;

  const verdicts = evaluateConditions(selected.conditionByWorkflowId, event, logger, triggerId);
  const mismatchIds = new Set(selected.mismatchIds);
  const matchedIds: string[] = [];
  for (const workflowId of selected.orderedIds.filter((id) => !mismatchIds.has(id))) {
    const verdict = verdicts.get(selected.conditionByWorkflowId.get(workflowId) ?? '') ?? 'matched';
    if (verdict === 'matched') {
      stats.matchedCount += 1;
      matchedIds.push(workflowId);
    } else if (verdict === 'kql_false') {
      stats.kqlFalseCount += 1;
    } else {
      stats.kqlErrorCount += 1;
    }
  }

  return { matchedIds, stats };
};

const selectWorkflowConditions = (
  groups: readonly SubscriptionCacheGroup[],
  event: Record<string, unknown>,
  requiresConnectorId: boolean
): {
  orderedIds: string[];
  conditionByWorkflowId: Map<string, string>;
  mismatchIds: string[];
} => {
  const orderedIds: string[] = [];
  const seen = new Set<string>();
  const remember = (workflowId: string) => {
    if (!seen.has(workflowId)) {
      seen.add(workflowId);
      orderedIds.push(workflowId);
    }
  };

  if (!requiresConnectorId) {
    const conditionByWorkflowId = new Map<string, string>();
    for (const group of groups) {
      for (const workflowId of group.workflowIds) {
        remember(workflowId);
        if (!conditionByWorkflowId.has(workflowId)) {
          conditionByWorkflowId.set(workflowId, group.condition);
        }
      }
    }
    return { orderedIds, conditionByWorkflowId, mismatchIds: [] };
  }

  const eventConnectorId = typeof event.connectorId === 'string' ? event.connectorId.trim() : '';
  const exact = new Map<string, string>();
  const wildcard = new Map<string, string>();
  for (const group of groups) {
    for (const workflowId of group.workflowIds) {
      remember(workflowId);
      if (group.connectorId === eventConnectorId && eventConnectorId !== '') {
        if (!exact.has(workflowId)) {
          exact.set(workflowId, group.condition);
        }
      } else if (group.connectorId === ALL_CONNECTOR_IDS && !wildcard.has(workflowId)) {
        wildcard.set(workflowId, group.condition);
      }
    }
  }

  const conditionByWorkflowId = new Map<string, string>();
  const mismatchIds: string[] = [];
  for (const workflowId of orderedIds) {
    const exactCondition = exact.get(workflowId);
    if (exactCondition !== undefined) {
      conditionByWorkflowId.set(workflowId, exactCondition);
    } else if (eventConnectorId !== '') {
      const wildcardCondition = wildcard.get(workflowId);
      if (wildcardCondition !== undefined) {
        conditionByWorkflowId.set(workflowId, wildcardCondition);
      } else {
        mismatchIds.push(workflowId);
      }
    } else {
      mismatchIds.push(workflowId);
    }
  }

  return { orderedIds, conditionByWorkflowId, mismatchIds };
};

const evaluateConditions = (
  conditionByWorkflowId: ReadonlyMap<string, string>,
  event: Record<string, unknown>,
  logger: Logger | undefined,
  triggerId: string
): Map<string, ConditionVerdict> => {
  const idsByCondition = new Map<string, string[]>();
  for (const [workflowId, condition] of conditionByWorkflowId) {
    const ids = idsByCondition.get(condition) ?? [];
    ids.push(workflowId);
    idsByCondition.set(condition, ids);
  }

  const verdicts = new Map<string, ConditionVerdict>();
  for (const [condition, workflowIds] of idsByCondition) {
    if (condition === '') {
      verdicts.set(condition, 'matched');
    } else {
      verdicts.set(condition, evaluateCondition(condition, workflowIds, event, logger, triggerId));
    }
  }
  return verdicts;
};

const evaluateCondition = (
  condition: string,
  workflowIds: readonly string[],
  event: Record<string, unknown>,
  logger: Logger | undefined,
  triggerId: string
): ConditionVerdict => {
  try {
    return evaluateKql(condition, { event }) ? 'matched' : 'kql_false';
  } catch (error) {
    logger?.warn(
      `Error evaluating KQL condition for workflows [${workflowIds.join(
        ', '
      )}], trigger ${triggerId}: ${condition}. Error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return 'kql_error';
  }
};
