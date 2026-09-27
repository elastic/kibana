/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StackFrame } from '@kbn/workflows';

/**
 * Returns one key per `parallel` branch the stack frames are nested in, outermost first.
 * Each key encodes the full scope path up to that branch, so the same branch index under
 * different enclosing loop iterations yields different keys.
 */
export const getParallelBranchKeys = (stackFrames: readonly StackFrame[]): string[] => {
  const path: string[] = [];
  const keys: string[] = [];
  for (const frame of stackFrames) {
    for (const scope of frame.nestedScopes) {
      path.push(`${scope.nodeId}:${scope.scopeId ?? ''}`);
      if (scope.nodeType === 'enter-parallel') {
        keys.push(path.join('/'));
      }
    }
  }
  return keys;
};

/**
 * True unless the two branch lineages diverge, i.e. they sit in different branches of the
 * same `parallel` step. A lineage is compatible with its ancestors and descendants.
 */
export const areParallelBranchesCompatible = (
  left: readonly string[],
  right: readonly string[]
): boolean => {
  const sharedDepth = Math.min(left.length, right.length);
  for (let depth = 0; depth < sharedDepth; depth++) {
    if (left[depth] !== right[depth]) {
      return false;
    }
  }
  return true;
};
