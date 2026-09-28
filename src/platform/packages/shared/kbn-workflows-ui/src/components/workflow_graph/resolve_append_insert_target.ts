/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InsertionPoints } from './compute_insertion_points';
import type { WorkflowGraphInsertionContext } from './workflow_graph_actions_context';

/**
 * Resolves the ⌘K / append-step splice target: end of the selected sequence,
 * or the top-level trunk when nothing is selected.
 */
export function resolveAppendInsertTarget(
  insertionPoints: InsertionPoints,
  selectedStepId: string | undefined
): WorkflowGraphInsertionContext | undefined {
  const { byNodeId, topLevelStepNodeIds } = insertionPoints;

  if (selectedStepId) {
    const selected = byNodeId.get(selectedStepId);
    if (selected?.step?.stepName) {
      // If this is a top-level step, find the trunk terminal.
      if (topLevelStepNodeIds.includes(selectedStepId)) {
        for (const nodeId of topLevelStepNodeIds) {
          const ports = byNodeId.get(nodeId);
          if (ports?.step?.isTerminal && ports.step.stepName) {
            return { mode: 'after', stepName: ports.step.stepName };
          }
        }
      }
      // Nested step or no trunk terminal found — insert directly after selection.
      return { mode: 'after', stepName: selected.step.stepName };
    }
  }

  // No selection: find trunk terminal.
  for (const nodeId of topLevelStepNodeIds) {
    const ports = byNodeId.get(nodeId);
    if (ports?.step?.isTerminal && ports.step.stepName) {
      return { mode: 'after', stepName: ports.step.stepName };
    }
  }

  // Fallback: any terminal step.
  for (const ports of byNodeId.values()) {
    if (ports.step?.isTerminal && ports.step.stepName) {
      return { mode: 'after', stepName: ports.step.stepName };
    }
  }

  return undefined;
}
