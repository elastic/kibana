/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InsertionPoints, StepPortTarget } from './compute_insertion_points';

const pathKey = (path: StepPortTarget['path']): string => JSON.stringify(path ?? []);

/**
 * Resolves the ⌘K / append-step splice target: end of the selected sequence,
 * or the top-level trunk when nothing is selected.
 */
export function resolveAppendInsertTarget(
  insertionPoints: InsertionPoints,
  selectedStepId: string | undefined
): StepPortTarget | undefined {
  const { byNodeId } = insertionPoints;

  if (selectedStepId) {
    const selected = byNodeId.get(selectedStepId);
    if (selected?.step) {
      const key = pathKey(selected.step.path);
      for (const ports of byNodeId.values()) {
        if (ports.step?.isTerminal && pathKey(ports.step.path) === key) {
          return ports.step;
        }
      }
      return selected.step;
    }
  }

  for (const ports of byNodeId.values()) {
    if (ports.step?.isTerminal && !ports.step.path) {
      return ports.step;
    }
  }

  for (const ports of byNodeId.values()) {
    if (ports.step && !ports.step.path) {
      return ports.step;
    }
  }

  return undefined;
}
