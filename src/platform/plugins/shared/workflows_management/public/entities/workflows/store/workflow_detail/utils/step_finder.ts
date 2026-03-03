/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowLookup } from './build_workflow_lookup';

export function findStepByLine(
  lineNumber: number,
  workflowLookup: WorkflowLookup
): string | undefined {
  if (!workflowLookup) {
    return;
  }

  const steps = Object.values(workflowLookup.steps);

  // Exact match: cursor is within the step's parsed range
  const exact = steps.find((step) => step.lineStart <= lineNumber && lineNumber <= step.lineEnd);
  if (exact) {
    return exact.stepId;
  }

  // Fallback: cursor is on a blank/continuation line just past a step's range.
  // Attribute it to the closest preceding step unless another step starts
  // at or before this line (i.e. cursor is in the gap between two steps).
  let best: (typeof steps)[number] | undefined;
  for (const step of steps) {
    if (step.lineEnd < lineNumber) {
      if (!best || step.lineEnd > best.lineEnd) {
        best = step;
      }
    }
  }

  if (best) {
    const anotherStepStartsBefore = steps.some(
      (s) => s.stepId !== best?.stepId && s.lineStart > best?.lineEnd && s.lineStart <= lineNumber
    );
    if (!anotherStepStartsBefore) {
      return best.stepId;
    }
  }

  return undefined;
}
