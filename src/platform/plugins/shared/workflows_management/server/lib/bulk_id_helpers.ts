/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';

import type { WorkflowProperties } from '../storage/workflow_storage';

export interface BulkFailureEntry {
  index: number;
  id: string;
  error: string;
}

export type IdSource = 'server-generated' | 'user-supplied';

export interface BulkWorkflowEntry {
  idx: number;
  id: string;
  idSource: IdSource;
  workflowData: WorkflowProperties;
  definition?: WorkflowYaml;
}

export interface RemovalResult {
  kept: BulkWorkflowEntry[];
  removed: BulkFailureEntry[];
}

/**
 * Partitions workflows by ID source: server-generated vs user-supplied.
 * Pure function — does not mutate the input array.
 */
export const partitionByIdSource = (
  workflows: readonly BulkWorkflowEntry[]
): { serverGenerated: BulkWorkflowEntry[]; userSupplied: BulkWorkflowEntry[] } => {
  const serverGenerated: BulkWorkflowEntry[] = [];
  const userSupplied: BulkWorkflowEntry[] = [];

  for (const wf of workflows) {
    if (wf.idSource === 'user-supplied') {
      userSupplied.push(wf);
    } else {
      serverGenerated.push(wf);
    }
  }

  return { serverGenerated, userSupplied };
};

/**
 * Removes workflows whose user-supplied ID already exists in the database.
 * Entries with `idSource: 'server-generated'` pass through unconditionally.
 * Pure function — does not mutate the input array.
 */
export const removeConflictingIds = (
  workflows: readonly BulkWorkflowEntry[],
  existingIds: ReadonlySet<string>
): RemovalResult => {
  const kept: BulkWorkflowEntry[] = [];
  const removed: BulkFailureEntry[] = [];

  for (const wf of workflows) {
    if (wf.idSource === 'user-supplied' && existingIds.has(wf.id)) {
      removed.push({
        index: wf.idx,
        id: wf.id,
        error: `Workflow with id '${wf.id}' already exists`,
      });
    } else {
      kept.push(wf);
    }
  }

  return { kept, removed };
};

/**
 * Deduplicates user-supplied IDs within a batch. First occurrence wins;
 * later duplicates are added to `removed`. Server-generated entries
 * (`idSource === 'server-generated'`) always pass through.
 * Pure function — does not mutate the input array.
 */
export const deduplicateUserIds = (workflows: readonly BulkWorkflowEntry[]): RemovalResult => {
  const seen = new Set<string>();
  const kept: BulkWorkflowEntry[] = [];
  const removed: BulkFailureEntry[] = [];

  for (const wf of workflows) {
    if (wf.idSource === 'user-supplied' && seen.has(wf.id)) {
      removed.push({
        index: wf.idx,
        id: wf.id,
        error: `Duplicate workflow id '${wf.id}' in batch`,
      });
    } else {
      if (wf.idSource === 'user-supplied') {
        seen.add(wf.id);
      }
      kept.push(wf);
    }
  }

  return { kept, removed };
};
