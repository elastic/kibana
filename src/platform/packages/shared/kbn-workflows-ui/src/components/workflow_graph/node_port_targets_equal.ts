/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NodePortTargets } from './compute_insertion_points';

const samePortStep = (a: NodePortTargets['step'], b: NodePortTargets['step']): boolean =>
  a === b ||
  (a !== undefined &&
    b !== undefined &&
    a.sourceNodeId === b.sourceNodeId &&
    a.stepName === b.stepName &&
    a.isTerminal === b.isTerminal);

const sameFallbackTarget = (
  a: NodePortTargets['fallbackTarget'],
  b: NodePortTargets['fallbackTarget']
): boolean =>
  a === b ||
  (a !== undefined && b !== undefined && a.stepName === b.stepName && a.nodeId === b.nodeId);

const sameBranches = (a: NodePortTargets['branches'], b: NodePortTargets['branches']): boolean => {
  if (a === b) return true;
  if (a === undefined || b === undefined || a.size !== b.size) return false;
  for (const [key, branch] of a) {
    const other = b.get(key);
    if (
      other === undefined ||
      other.ownerStepName !== branch.ownerStepName ||
      other.isTerminal !== branch.isTerminal ||
      JSON.stringify(other.slot) !== JSON.stringify(branch.slot)
    ) {
      return false;
    }
  }
  return true;
};

/** Structural equality for one node's port targets (entries are rebuilt per YAML edit). */
export const nodePortTargetsEqual = (a: NodePortTargets, b: NodePortTargets): boolean =>
  a.fallbackConnected === b.fallbackConnected &&
  samePortStep(a.step, b.step) &&
  sameFallbackTarget(a.fallbackTarget, b.fallbackTarget) &&
  sameBranches(a.branches, b.branches);
