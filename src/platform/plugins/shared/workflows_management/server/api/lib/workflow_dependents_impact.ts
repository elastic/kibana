/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import {
  analyzeCalledWorkflows,
  analyzeDependents,
  analyzeRemovalImpact,
  buildDependentsIndex,
  MAX_INDIRECT_DEPTH,
} from '../../../common/lib/workflow_dependents/analyze_dependents';
import type { WorkflowDependentsImpactResponse } from '../../../common/lib/workflow_dependents/api';
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
  getWorkflowsByIds: (workflowIds: string[]) => Promise<WorkflowLookupItem[]>;
}

/** Parses draft YAML into the plain definition the analysis reads; null when it doesn't parse. */
export const parseDraftDefinition = (yaml: string): unknown => {
  const document = parseDocument(yaml);
  if (document.errors.length > 0) {
    return null;
  }
  // `toJS` throws on an unresolved alias, which `parseDocument` doesn't report as an error.
  try {
    return document.toJS();
  } catch {
    return null;
  }
};

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

/** Collects the workflows `definition` runs, and the ones those run, down the chain. */
export const collectCalledWorkflows = async (
  workflowId: string,
  definition: unknown,
  lookup: WorkflowDependentsLookup
): Promise<WorkflowLookupItem[]> => {
  const found = new Map<string, WorkflowLookupItem>();
  const requested = new Set([workflowId]);
  let frontier = getCalledWorkflowIds(definition).filter((id) => !requested.has(id));

  for (let depth = 1; depth <= MAX_INDIRECT_DEPTH && frontier.length > 0; depth++) {
    frontier.forEach((id) => requested.add(id));
    const workflows = await lookup.getWorkflowsByIds(frontier);
    workflows.forEach((workflow) => found.set(workflow.id, workflow));
    frontier = [
      ...new Set(workflows.flatMap((workflow) => getCalledWorkflowIds(workflow.definition))),
    ].filter((id) => !requested.has(id));
  }

  return [...found.values()];
};

/** Grades the workflows that run a workflow, and the ones it runs, against its draft. */
export const analyzeWorkflowDependentsImpact = async ({
  workflowId,
  savedDefinition,
  draftDefinition,
  isDraftValid = true,
  managed = false,
  lookup,
}: {
  workflowId: string;
  savedDefinition: unknown;
  draftDefinition: unknown;
  /** False when saving the draft would store it invalid. */
  isDraftValid?: boolean;
  /** Whether the workflow is managed, which decides what it can run and what can run it. */
  managed?: boolean;
  lookup: WorkflowDependentsLookup;
}): Promise<WorkflowDependentsImpactResponse> => {
  const [callers, calledWorkflows] = await Promise.all([
    collectCallers([workflowId], lookup),
    collectCalledWorkflows(workflowId, draftDefinition, lookup),
  ]);

  return {
    analysis: analyzeDependents({
      index: buildDependentsIndex(workflowId, callers),
      savedDefinition,
      draftDefinition,
      isDraftValid,
      managed,
    }),
    calledWorkflows: analyzeCalledWorkflows({
      workflowId,
      definition: draftDefinition,
      workflows: calledWorkflows,
      managed,
    }),
  };
};

/** Lists the workflows that fail when `workflowIds` are turned off or deleted. */
export const analyzeWorkflowRemovalImpact = async (
  workflowIds: readonly string[],
  lookup: WorkflowDependentsLookup
): Promise<RemovalImpact> =>
  analyzeRemovalImpact(workflowIds, await collectCallers(workflowIds, lookup));
