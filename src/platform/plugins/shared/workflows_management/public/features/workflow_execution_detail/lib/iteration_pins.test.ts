/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  iterationGapCount,
  type IterationInfo,
  type IterationPlanItem,
  planIterationCollapse,
} from './iteration_pins';

describe('planIterationCollapse', () => {
  const idxs = (...ns: number[]): IterationInfo[] =>
    ns.map((index) => ({ index, hasFailed: false, isInFlight: false }));

  it('renders every iteration as a pin when count is at or below the threshold', () => {
    const plan = planIterationCollapse(idxs(0, 1, 2), {
      isExecutionComplete: true,
      threshold: 5,
    });
    expect(plan.every((p) => p.type === 'pin')).toBe(true);
    expect(plan).toHaveLength(3);
    expect(plan.some((p) => p.type === 'gap')).toBe(false);
  });

  it('pins only the latest when there are no failures (one gap + tip)', () => {
    const plan = planIterationCollapse(idxs(0, 1, 2, 3, 4, 5), {
      isExecutionComplete: true,
      threshold: 5,
    });
    expect(plan).toEqual([
      { type: 'gap', from: 0, to: 4 },
      { type: 'pin', index: 5, kinds: ['latest'], autoExpand: false },
    ]);
  });

  it('pins a mid-loop failure between gaps and the latest (50 / #46 example)', () => {
    const iterations: IterationInfo[] = Array.from({ length: 50 }, (_, i) => ({
      index: i + 1,
      hasFailed: i + 1 === 46,
      isInFlight: false,
    }));
    const plan = planIterationCollapse(iterations, {
      isExecutionComplete: true,
      threshold: 5,
    });
    expect(plan).toEqual([
      { type: 'gap', from: 1, to: 45 },
      { type: 'pin', index: 46, kinds: ['failed'], autoExpand: true },
      { type: 'gap', from: 47, to: 49 },
      { type: 'pin', index: 50, kinds: ['latest'], autoExpand: false },
    ]);
    expect(iterationGapCount(1, 45)).toBe(45);
    expect(iterationGapCount(47, 49)).toBe(3);
  });

  it('puts failed + latest on a single pin when the last iteration failed', () => {
    const plan = planIterationCollapse(
      [
        { index: 0, hasFailed: false, isInFlight: false },
        { index: 1, hasFailed: false, isInFlight: false },
        { index: 2, hasFailed: false, isInFlight: false },
        { index: 3, hasFailed: false, isInFlight: false },
        { index: 4, hasFailed: false, isInFlight: false },
        { index: 5, hasFailed: true, isInFlight: false },
      ],
      { isExecutionComplete: true, threshold: 5 }
    );
    expect(plan).toEqual([
      { type: 'gap', from: 0, to: 4 },
      { type: 'pin', index: 5, kinds: ['failed', 'latest'], autoExpand: true },
    ]);
  });

  it('auto-expands only the first failed pin when several fail', () => {
    const plan = planIterationCollapse(
      [
        { index: 0, hasFailed: true, isInFlight: false },
        { index: 1, hasFailed: false, isInFlight: false },
        { index: 2, hasFailed: true, isInFlight: false },
        { index: 3, hasFailed: false, isInFlight: false },
        { index: 4, hasFailed: false, isInFlight: false },
        { index: 5, hasFailed: false, isInFlight: false },
      ],
      { isExecutionComplete: true, threshold: 5 }
    );
    const pins = plan.filter(
      (p): p is Extract<IterationPlanItem, { type: 'pin' }> => p.type === 'pin'
    );
    expect(pins.find((p) => p.index === 0)?.autoExpand).toBe(true);
    expect(pins.find((p) => p.index === 2)?.autoExpand).toBe(false);
  });

  it('pins the in-flight iteration with a running tag while the execution is active', () => {
    const plan = planIterationCollapse(
      [
        { index: 0, hasFailed: false, isInFlight: false },
        { index: 1, hasFailed: false, isInFlight: false },
        { index: 2, hasFailed: false, isInFlight: false },
        { index: 3, hasFailed: false, isInFlight: false },
        { index: 4, hasFailed: false, isInFlight: false },
        { index: 5, hasFailed: false, isInFlight: true },
      ],
      { isExecutionComplete: false, threshold: 5 }
    );
    expect(plan).toEqual([
      { type: 'gap', from: 0, to: 4 },
      { type: 'pin', index: 5, kinds: ['running'], autoExpand: false },
    ]);
  });

  it('covers every iteration index exactly once (rollup invariant basis)', () => {
    const iterations: IterationInfo[] = Array.from({ length: 50 }, (_, i) => ({
      index: i + 1,
      hasFailed: i + 1 === 46 || i + 1 === 10,
      isInFlight: false,
    }));
    const plan = planIterationCollapse(iterations, {
      isExecutionComplete: true,
      threshold: 5,
    });
    const covered: number[] = [];
    for (const entry of plan) {
      if (entry.type === 'gap') {
        for (let i = entry.from; i <= entry.to; i++) covered.push(i);
      } else {
        covered.push(entry.index);
      }
    }
    expect(covered.sort((a, b) => a - b)).toEqual(
      iterations.map((it) => it.index).sort((a, b) => a - b)
    );

    // Duration/token rollups over gaps + pins equal the parent total when each
    // iteration contributes a fixed amount.
    const perIterDuration = 10;
    const perIterTokens = 7;
    const gapAndPinDuration = plan.reduce((sum, entry) => {
      if (entry.type === 'gap') {
        return sum + iterationGapCount(entry.from, entry.to) * perIterDuration;
      }
      return sum + perIterDuration;
    }, 0);
    const gapAndPinTokens = plan.reduce((sum, entry) => {
      if (entry.type === 'gap') {
        return sum + iterationGapCount(entry.from, entry.to) * perIterTokens;
      }
      return sum + perIterTokens;
    }, 0);
    expect(gapAndPinDuration).toBe(50 * perIterDuration);
    expect(gapAndPinTokens).toBe(50 * perIterTokens);
  });
});
