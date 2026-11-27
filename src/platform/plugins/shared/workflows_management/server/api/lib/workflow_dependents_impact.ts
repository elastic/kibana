/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  analyzeRemovalImpact,
  MAX_INDIRECT_DEPTH,
} from '../../../common/lib/workflow_dependents/analyze_dependents';
import { getCalledWorkflowIds } from '../../../common/lib/workflow_dependents/find_call_sites';
import type {
  RemovalImpact,
  WorkflowLookupItem,
} from '../../../common/lib/workflow_dependents/types';

export interface WorkflowDependentsLookup {
  /** Workflows whose indexed `calledWorkflowIds` contain any of `workflowIds`. */
  findIndexedCallers: (workflowIds: string[]) => Promise<WorkflowLookupItem[]>;
  /** Workflows saved before `calledWorkflowIds` existed, whose callees are not indexed. */
  findUnindexedWorkflows: () => Promise<WorkflowLookupItem[]>;
}

/** Collects every workflow that runs any of `workflowIds`, directly or through other workflows. */
export const collectCallers = async (
  workflowIds: readonly string[],
  lookup: WorkflowDependentsLookup
): Promise<WorkflowLookupItem[]> => {
  const unindexed = await lookup.findUnindexedWorkflows();
  const startIds = new Set(workflowIds);
  const found = new Map<string, WorkflowLookupItem>();
  let frontier = [...startIds];

  for (let depth = 1; depth <= MAX_INDIRECT_DEPTH && frontier.length > 0; depth++) {
    const frontierIds = new Set(frontier);
    const indexedCallers = await lookup.findIndexedCallers(frontier);
    const unindexedCallers = unindexed.filter(({ definition }) =>
      getCalledWorkflowIds(definition).some((id) => frontierIds.has(id))
    );
    const newCallers = [...indexedCallers, ...unindexedCallers].filter(
      ({ id }) => !startIds.has(id) && !found.has(id)
    );
    newCallers.forEach((caller) => found.set(caller.id, caller));
    frontier = [...new Set(newCallers.map(({ id }) => id))];
  }

  return [...found.values()];
};

/** Lists the workflows that fail when `workflowIds` are turned off or deleted. */
export const analyzeWorkflowRemovalImpact = async (
  workflowIds: readonly string[],
  lookup: WorkflowDependentsLookup
): Promise<RemovalImpact> =>
  analyzeRemovalImpact(workflowIds, await collectCallers(workflowIds, lookup));
