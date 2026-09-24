/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Foreach/while iteration collapse: pin exemplars (failures + tip) and fold the
 * rest into gap rows. Future follow-up: when mass failures would pin most of the
 * loop (e.g. 40 of 50), summarize as an "N failed iterations" pin instead of
 * pinning every failure.
 */

/** Collapse into pins + gaps only when iteration count exceeds this. */
export const ITERATION_COLLAPSE_THRESHOLD = 5;

export type IterationPinKind = 'failed' | 'latest' | 'running';

export interface IterationInfo {
  index: number;
  hasFailed: boolean;
  /** True when this iteration is the in-flight one of a still-running execution. */
  isInFlight: boolean;
}

export type IterationPlanItem =
  | {
      type: 'pin';
      index: number;
      kinds: IterationPinKind[];
      /** Auto-expand this pin's steps on first load (first failed pin only). */
      autoExpand: boolean;
    }
  | {
      type: 'gap';
      /** Inclusive range start. */
      from: number;
      /** Inclusive range end. */
      to: number;
    };

export interface PlanIterationCollapseOptions {
  /** True when the workflow execution has finished (completed/failed/cancelled/…). */
  isExecutionComplete: boolean;
  threshold?: number;
}

const pinKindsFor = (
  it: IterationInfo,
  tipIndex: number,
  isExecutionComplete: boolean
): IterationPinKind[] => {
  const kinds: IterationPinKind[] = [];
  if (it.hasFailed) {
    kinds.push('failed');
  }
  if (isExecutionComplete && it.index === tipIndex) {
    kinds.push('latest');
  }
  if (!isExecutionComplete && it.isInFlight) {
    kinds.push('running');
  }
  return kinds;
};

/**
 * Build the chronological pin/gap plan for a foreach (or while) iteration list.
 * Below/at the threshold every iteration is a pin with no gaps.
 */
export const planIterationCollapse = (
  iterations: IterationInfo[],
  options: PlanIterationCollapseOptions
): IterationPlanItem[] => {
  const threshold = options.threshold ?? ITERATION_COLLAPSE_THRESHOLD;
  const sorted = [...iterations].sort((a, b) => a.index - b.index);
  if (sorted.length === 0) {
    return [];
  }

  const tip = sorted[sorted.length - 1];
  let firstFailedAutoExpanded = false;

  const toPin = (it: IterationInfo): IterationPlanItem => {
    const kinds = pinKindsFor(it, tip.index, options.isExecutionComplete);
    const autoExpand = it.hasFailed && !firstFailedAutoExpanded;
    if (autoExpand) {
      firstFailedAutoExpanded = true;
    }
    return { type: 'pin', index: it.index, kinds, autoExpand };
  };

  if (sorted.length <= threshold) {
    return sorted.map(toPin);
  }

  const pinned = new Set<number>();
  for (const it of sorted) {
    if (it.hasFailed) {
      pinned.add(it.index);
    }
  }
  if (options.isExecutionComplete) {
    pinned.add(tip.index);
  } else {
    const inFlight = sorted.find((it) => it.isInFlight) ?? tip;
    pinned.add(inFlight.index);
  }

  const items: IterationPlanItem[] = [];
  let gapFrom: number | null = null;
  let gapTo: number | null = null;

  const flushGap = () => {
    if (gapFrom != null && gapTo != null) {
      items.push({ type: 'gap', from: gapFrom, to: gapTo });
    }
    gapFrom = null;
    gapTo = null;
  };

  for (const it of sorted) {
    if (pinned.has(it.index)) {
      flushGap();
      items.push(toPin(it));
    } else if (gapFrom == null) {
      gapFrom = it.index;
      gapTo = it.index;
    } else {
      gapTo = it.index;
    }
  }
  flushGap();

  return items;
};

export const iterationGapId = (foreachParentId: string, from: number, to: number): string =>
  `foreach-gap:${foreachParentId}:${from}-${to}`;

/** Inclusive count of indices in a gap range. */
export const iterationGapCount = (from: number, to: number): number => to - from + 1;
