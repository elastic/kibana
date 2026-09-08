/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StepInfo } from '@kbn/workflows-yaml';

export interface BranchGroup {
  /** Stable identity of this branch: parent-of-branch-root + branchKey. */
  branchId: string;
  /** Index of the first step in this branch. */
  firstIndex: number;
  /** Index of the last step in this branch. */
  lastIndex: number;
}

export interface ParentGroup {
  /** Index of the depth-0 parent step. */
  parentIndex: number;
  /** Branches under this parent, sorted by firstIndex. Each gets its own rail + connector. */
  branches: BranchGroup[];
}

export interface NestingInfo {
  depths: Map<string, number>;
  parentGroups: ParentGroup[];
  hasNesting: boolean;
}

export const buildNestingInfo = (
  stepEntries: Array<[string, StepInfo]>,
  stepsMap: Record<string, StepInfo>
): NestingInfo => {
  // Depth via parentStepId chain. The chain may pass through container nodes
  // (e.g. `parallel` branch entries that have a `name` but no `type`) which are
  // not registered steps — the walk stops there, still yielding depth >= 1,
  // which is all the two-track layout needs.
  const depths = new Map<string, number>();
  // Cap the walk at stepEntries.length: `steps` is keyed by user-authored id, not
  // structurally guaranteed to be a tree. A cycle in parentStepId (malformed YAML)
  // would otherwise spin the loop forever on every keystroke.
  const maxDepth = stepEntries.length;
  for (const [id, step] of stepEntries) {
    let depth = 0;
    let current: StepInfo | undefined = step;
    while (current?.parentStepId && depth < maxDepth) {
      depth++;
      current = stepsMap[current.parentStepId];
    }
    depths.set(id, depth);
  }

  // Group nested steps under their top-level ancestor, found positionally:
  // entries are sorted by lineStart and a parent's line range contains its whole
  // subtree, so the owning top-level step is simply the last depth-0 step seen.
  // This stays correct even when parentStepId points at an unregistered
  // container node (whose id can't be resolved through stepsMap).
  //
  // Within a parent, group by branch identity: the (parentStepId, branchKey)
  // pair of the highest chain node below the top level. Distinct branches
  // (`steps` vs `else`, or separate `parallel` branch containers) must NOT be
  // joined by one rail — they are alternative paths, not a sequence.
  const groupMap = new Map<number, Map<string, { firstIndex: number; lastIndex: number }>>();
  let topLevelIndex = -1;
  let topLevelId: string | undefined;

  stepEntries.forEach(([stepId, step], index) => {
    if ((depths.get(stepId) ?? 0) === 0) {
      topLevelIndex = index;
      topLevelId = stepId;
      return;
    }
    // Nested step appearing before any top-level step (malformed YAML) — leave ungrouped.
    if (topLevelIndex === -1) return;

    // Walk up to the branch root: the highest node whose parent is either the
    // top-level ancestor itself or an unregistered container under it.
    let node: StepInfo = step;
    let walkDepth = 0;
    while (
      node.parentStepId &&
      node.parentStepId !== topLevelId &&
      stepsMap[node.parentStepId] &&
      walkDepth < maxDepth
    ) {
      node = stepsMap[node.parentStepId];
      walkDepth++;
    }
    const branchId = `${node.parentStepId ?? ''}:${node.branchKey ?? 'steps'}`;

    let byBranch = groupMap.get(topLevelIndex);
    if (!byBranch) {
      byBranch = new Map();
      groupMap.set(topLevelIndex, byBranch);
    }
    const branch = byBranch.get(branchId);
    if (!branch) {
      byBranch.set(branchId, { firstIndex: index, lastIndex: index });
    } else {
      branch.firstIndex = Math.min(branch.firstIndex, index);
      branch.lastIndex = Math.max(branch.lastIndex, index);
    }
  });

  const parentGroups: ParentGroup[] = [];
  for (const [parentIndex, byBranch] of groupMap) {
    const branches: BranchGroup[] = [...byBranch.entries()]
      .map(([branchId, { firstIndex, lastIndex }]) => ({ branchId, firstIndex, lastIndex }))
      .sort((a, b) => a.firstIndex - b.firstIndex);
    parentGroups.push({ parentIndex, branches });
  }

  const hasNesting = [...depths.values()].some((depth) => depth > 0);
  return { depths, parentGroups, hasNesting };
};
