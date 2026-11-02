/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StackFrame } from '@kbn/workflows';

/** A `parallel` branch in a scope stack: the fan-out instance and the branch within it. */
export interface ParallelBranchScope {
  /** Scope path up to the `parallel` node, so each loop iteration is a separate fan-out. */
  fanOut: string;
  branch: string;
}

/** Returns the `parallel` branches the stack frames are nested in, outermost first. */
export const getParallelBranchScopes = (
  stackFrames: readonly StackFrame[]
): ParallelBranchScope[] => {
  const path: string[] = [];
  const branchScopes: ParallelBranchScope[] = [];
  for (const frame of stackFrames) {
    for (const scope of frame.nestedScopes) {
      if (scope.nodeType === 'enter-parallel') {
        branchScopes.push({
          fanOut: [...path, scope.nodeId].join('/'),
          branch: scope.scopeId ?? '',
        });
      }
      path.push(`${scope.nodeId}:${scope.scopeId ?? ''}`);
    }
  }
  return branchScopes;
};

/**
 * True unless the two lineages sit in different branches of the same `parallel` fan-out.
 * Branches of an unrelated (e.g. already joined) fan-out stay visible.
 */
export const areParallelBranchesCompatible = (
  left: readonly ParallelBranchScope[],
  right: readonly ParallelBranchScope[]
): boolean => {
  const sharedDepth = Math.min(left.length, right.length);
  for (let depth = 0; depth < sharedDepth; depth++) {
    if (left[depth].fanOut !== right[depth].fanOut) {
      return true;
    }
    if (left[depth].branch !== right[depth].branch) {
      return false;
    }
  }
  return true;
};
