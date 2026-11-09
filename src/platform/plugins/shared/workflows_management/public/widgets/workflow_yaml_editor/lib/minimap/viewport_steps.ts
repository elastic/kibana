/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StepInfo } from '@kbn/workflows-yaml';

export interface VisibleLineRange {
  start: number;
  end: number;
}

export interface ViewportStepRange {
  first: number;
  last: number;
}

/**
 * For parent steps, `lineEnd` spans their entire subtree. Trims each step's effective
 * end to just before its first direct child so that a parent whose name is off-screen
 * is not falsely included in the viewport band.
 *
 * Depends only on `stepEntries` (not on scroll position), so callers should memoize it
 * separately from `computeViewportSteps` — otherwise it gets rebuilt on every scroll frame
 * for no reason.
 */
export const buildEffectiveLineEnd = (
  stepEntries: Array<[string, StepInfo]>
): Map<string, number> => {
  // stepEntries is sorted by lineStart, so for a given parent the first child
  // encountered has the smallest lineStart — each subsequent child can only shrink
  // the effective end further, never grow it, which is why Math.min is correct here.
  const effectiveLineEnd = new Map<string, number>(
    stepEntries.map(([id, step]) => [id, step.lineEnd])
  );
  for (const [, step] of stepEntries) {
    const parentEnd = step.parentStepId ? effectiveLineEnd.get(step.parentStepId) : undefined;
    if (step.parentStepId && parentEnd !== undefined) {
      effectiveLineEnd.set(step.parentStepId, Math.min(parentEnd, step.lineStart - 1));
    }
  }
  return effectiveLineEnd;
};

/** First and last index of steps currently in the visible viewport. */
export const computeViewportSteps = (
  stepEntries: Array<[string, StepInfo]>,
  effectiveLineEnd: Map<string, number>,
  visibleLineRange: VisibleLineRange | null
): ViewportStepRange | null => {
  if (!visibleLineRange || stepEntries.length === 0) return null;

  let first = -1;
  let last = -1;
  stepEntries.forEach(([id, step], index) => {
    const end = effectiveLineEnd.get(id) ?? step.lineEnd;
    if (end >= visibleLineRange.start && step.lineStart <= visibleLineRange.end) {
      if (first === -1) first = index;
      last = index;
    }
  });
  if (first !== -1) return { first, last };

  // Viewport doesn't overlap any step (e.g. looking at the YAML header above `steps:`).
  // Clamp to the nearest step boundary so the indicator is always visible.
  const lastIdx = stepEntries.length - 1;
  if (visibleLineRange.end < stepEntries[0][1].lineStart) return { first: 0, last: 0 };
  if (visibleLineRange.start > stepEntries[lastIdx][1].lineEnd) {
    return { first: lastIdx, last: lastIdx };
  }
  // Between two consecutive steps — span both neighbours.
  const belowIdx = stepEntries.findIndex(([, s]) => s.lineStart > visibleLineRange.end);
  const idx = belowIdx > 0 ? belowIdx - 1 : 0;
  return { first: idx, last: Math.min(idx + 1, lastIdx) };
};
