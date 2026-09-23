/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import type { StepInfo } from '@kbn/workflows-yaml';
import {
  buildStepDurations,
  EMPTY_STEP_DURATIONS,
  formatStepDurationLabel,
  getDurationGutterWidth,
  getStepDurationTone,
} from './build_step_durations';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeStepInfo = (stepId: string, stepType: string, parentStepId?: string): StepInfo =>
  ({
    stepId,
    stepType,
    lineStart: 1,
    lineEnd: 5,
    propInfos: {},
    parentStepId,
  } as unknown as StepInfo);

const makeExec = (
  stepId: string,
  stepType: string,
  executionTimeMs?: number,
  scopeStack: WorkflowStepExecutionDto['scopeStack'] = []
): WorkflowStepExecutionDto =>
  ({
    stepId,
    stepType,
    executionTimeMs,
    scopeStack,
    status: 'completed',
  } as unknown as WorkflowStepExecutionDto);

// ---------------------------------------------------------------------------
// buildStepDurations
// ---------------------------------------------------------------------------

describe('buildStepDurations', () => {
  it('returns EMPTY_STEP_DURATIONS when called with no executions', () => {
    const result = buildStepDurations([], {});
    expect(result.size).toBe(0);
  });

  it('counts a single finished step', () => {
    const steps = { step_a: makeStepInfo('step_a', 'http.request') };
    const execs = [makeExec('step_a', 'http.request', 120)];
    const result = buildStepDurations(execs, steps);
    expect(result.get('step_a')).toEqual({
      totalMs: 120,
      runCount: 1,
      hasDuration: true,
      minMs: 120,
      maxMs: 120,
    });
  });

  it('returns no entry when every doc for a step is in-flight (executionTimeMs absent)', () => {
    // In-flight docs never make it into the result — there is nothing to display yet.
    const steps = { step_a: makeStepInfo('step_a', 'http.request') };
    const execs = [makeExec('step_a', 'http.request', undefined)];
    const result = buildStepDurations(execs, steps);
    expect(result.get('step_a')).toBeUndefined();
  });

  it('in-flight doc does not dilute the average when a completed run exists', () => {
    // One completed retry at 100ms + one in-flight retry.
    // runCount, totalMs, min, max must all reflect only the completed run.
    const steps = { step_a: makeStepInfo('step_a', 'http.request') };
    const execs = [
      makeExec('step_a', 'http.request', 100),
      makeExec('step_a', 'http.request', undefined), // still running
    ];
    const result = buildStepDurations(execs, steps);
    expect(result.get('step_a')).toEqual({
      totalMs: 100,
      runCount: 1,
      hasDuration: true,
      minMs: 100,
      maxMs: 100,
    });
  });

  it('drops docs whose stepId is absent from the lookup', () => {
    const steps = { step_a: makeStepInfo('step_a', 'http.request') };
    const execs = [makeExec('unknown_step', 'http.request', 50)];
    const result = buildStepDurations(execs, steps);
    expect(result.size).toBe(0);
  });

  it('drops wrapper docs that share a stepId but have a different stepType', () => {
    const steps = { step_a: makeStepInfo('step_a', 'http.request') };
    const execs = [
      makeExec('step_a', 'step_level_timeout', 1204), // wrapper
      makeExec('step_a', 'on-failure', 1198), // wrapper
      makeExec('step_a', 'http.request', 1150), // real doc
    ];
    const result = buildStepDurations(execs, steps);
    // Only the real doc counts — no inflation.
    expect(result.get('step_a')).toEqual({
      totalMs: 1150,
      runCount: 1,
      hasDuration: true,
      minMs: 1150,
      maxMs: 1150,
    });
  });

  it('excludes Infinity from totals, min, and max', () => {
    // Infinity cannot arrive from Elasticsearch (JSON has no Infinity literal), but the
    // guard is defensive; any non-finite payload must not corrupt subsequent arithmetic.
    const steps = { step_a: makeStepInfo('step_a', 'http.request') };
    const execs = [
      makeExec('step_a', 'http.request', Infinity),
      makeExec('step_a', 'http.request', 100),
    ];
    const result = buildStepDurations(execs, steps);
    const entry = result.get('step_a');
    expect(entry?.totalMs).toBe(100);
    expect(entry?.runCount).toBe(1);
    expect(Number.isFinite(entry?.minMs)).toBe(true);
    expect(Number.isFinite(entry?.maxMs)).toBe(true);
  });

  it('tracks two independent steps', () => {
    const steps = {
      step_a: makeStepInfo('step_a', 'http.request'),
      step_b: makeStepInfo('step_b', 'send.email'),
    };
    const execs = [makeExec('step_a', 'http.request', 45), makeExec('step_b', 'send.email', 120)];
    const result = buildStepDurations(execs, steps);
    expect(result.get('step_a')?.totalMs).toBe(45);
    expect(result.get('step_b')?.totalMs).toBe(120);
  });

  it('foreach: loop step shows total (runCount=1), children show completed run count', () => {
    // Loop step itself: one doc with the whole wall clock.
    // Children: one doc per iteration, each with a numeric scopeId on the loop frame.
    const steps = {
      my_loop: makeStepInfo('my_loop', 'foreach'),
      child_step: makeStepInfo('child_step', 'http.request', 'my_loop'),
    };

    // Loop step doc: no nested scopes on its own frame.
    const loopExec = makeExec('my_loop', 'foreach', 867, []);

    // Child docs: each has a scope stack where the loop frame has a numeric scopeId.
    const makeChildExec = (iterationScopeId: string, ms: number) =>
      makeExec('child_step', 'http.request', ms, [
        {
          stepId: 'my_loop',
          nestedScopes: [
            {
              nodeId: 'enterForeach_my_loop',
              nodeType: 'enter-foreach',
              scopeId: iterationScopeId,
            },
          ],
        },
      ]);

    const execs = [
      loopExec,
      makeChildExec('0', 289),
      makeChildExec('1', 289),
      makeChildExec('2', 289),
    ];

    const result = buildStepDurations(execs, steps);

    // Loop step: foreach stepType forces runCount=1 so the chip shows total wall clock, not ~avg.
    const loop = result.get('my_loop');
    expect(loop?.totalMs).toBe(867);
    expect(loop?.runCount).toBe(1);

    // Child: 3 completed docs → runCount = 3 (non-loop step, shows ~avg in chip + tooltip).
    const child = result.get('child_step');
    expect(child?.totalMs).toBe(867); // 289 × 3
    expect(child?.runCount).toBe(3);
    expect(child?.hasDuration).toBe(true);
    expect(child?.minMs).toBe(289);
    expect(child?.maxMs).toBe(289);
  });

  it('parallel: container shows runCount=1 even when branch children have numeric scopeIds', () => {
    // The engine assigns a distinct numeric branch index as the scopeId for each parallel branch.
    // The parallel container step itself has one doc spanning the full fan-out wall clock.
    // Regression: the old pass-1 scope-tracking code treated those numeric branch scopeIds as loop
    // iterations and set runCount = branch-count (3) for the container. The container must show 1.
    const steps = {
      my_parallel: makeStepInfo('my_parallel', 'parallel'),
      branch_a: makeStepInfo('branch_a', 'http.request', 'my_parallel'),
      branch_b: makeStepInfo('branch_b', 'http.request', 'my_parallel'),
      branch_c: makeStepInfo('branch_c', 'http.request', 'my_parallel'),
    };

    // Parallel container: one completed doc, full wall clock (branch children overlapped).
    const parallelExec = makeExec('my_parallel', 'parallel', 1200);

    // Each branch child runs once in its own distinct numeric scope (0, 1, 2).
    const makeBranchExec = (branchId: string, branchIndex: string, ms: number) =>
      makeExec(branchId, 'http.request', ms, [
        {
          stepId: 'my_parallel',
          nestedScopes: [
            { nodeId: `enterBranch_${branchIndex}`, nodeType: 'parallel', scopeId: branchIndex },
          ],
        },
      ]);

    const execs = [
      parallelExec,
      makeBranchExec('branch_a', '0', 800),
      makeBranchExec('branch_b', '1', 400),
      makeBranchExec('branch_c', '2', 1200),
    ];

    const result = buildStepDurations(execs, steps);

    // Container: one completed doc → runCount = 1, regardless of the 3 distinct branch indices.
    const container = result.get('my_parallel');
    expect(container?.totalMs).toBe(1200);
    expect(container?.runCount).toBe(1);

    // Branches each ran once.
    expect(result.get('branch_a')?.runCount).toBe(1);
    expect(result.get('branch_b')?.runCount).toBe(1);
    expect(result.get('branch_c')?.runCount).toBe(1);
  });

  it('tracks min and max across multiple runs of the same step', () => {
    const steps = { step_a: makeStepInfo('step_a', 'http.request') };
    const execs = [
      makeExec('step_a', 'http.request', 100),
      makeExec('step_a', 'http.request', 200),
      makeExec('step_a', 'http.request', 150),
    ];
    const result = buildStepDurations(execs, steps);
    const entry = result.get('step_a');
    expect(entry?.totalMs).toBe(450);
    expect(entry?.runCount).toBe(3);
    expect(entry?.minMs).toBe(100);
    expect(entry?.maxMs).toBe(200);
  });

  it('nested foreach: inner loop counts its own iterations separately', () => {
    const steps = {
      outer_loop: makeStepInfo('outer_loop', 'foreach'),
      inner_loop: makeStepInfo('inner_loop', 'foreach', 'outer_loop'),
      leaf: makeStepInfo('leaf', 'http.request', 'inner_loop'),
    };

    // Two outer iterations; each outer iteration runs the inner loop twice.
    const makeScopeStack = (
      outerScope: string,
      innerScope: string
    ): WorkflowStepExecutionDto['scopeStack'] => [
      {
        stepId: 'outer_loop',
        nestedScopes: [
          { nodeId: 'enterForeach_outer', nodeType: 'enter-foreach', scopeId: outerScope },
        ],
      },
      {
        stepId: 'inner_loop',
        nestedScopes: [
          { nodeId: 'enterForeach_inner', nodeType: 'enter-foreach', scopeId: innerScope },
        ],
      },
    ];

    const execs = [
      // leaf runs 2 outer × 2 inner = 4 times (one completed doc per leaf execution)
      makeExec('leaf', 'http.request', 50, makeScopeStack('0', '0')),
      makeExec('leaf', 'http.request', 50, makeScopeStack('0', '1')),
      makeExec('leaf', 'http.request', 50, makeScopeStack('1', '0')),
      makeExec('leaf', 'http.request', 50, makeScopeStack('1', '1')),
    ];

    const result = buildStepDurations(execs, steps);
    const leaf = result.get('leaf');
    expect(leaf?.totalMs).toBe(200);
    // 4 completed docs → runCount = 4.
    expect(leaf?.runCount).toBe(4);
  });

  it('retry attempts: non-numeric scopeId does not inflate iteration count', () => {
    const steps = { step_a: makeStepInfo('step_a', 'http.request') };

    // Two retry docs — scopeId is non-numeric (e.g. '1-attempt', '2-attempt').
    const makeRetryExec = (attempt: string, ms: number) =>
      makeExec('step_a', 'http.request', ms, [
        {
          stepId: 'step_a',
          nestedScopes: [
            { nodeId: 'enterRetry_step_a', nodeType: 'enter-retry', scopeId: attempt },
          ],
        },
      ]);

    const execs = [makeRetryExec('attempt-1', 100), makeRetryExec('attempt-2', 150)];
    const result = buildStepDurations(execs, steps);
    const entry = result.get('step_a');
    expect(entry?.totalMs).toBe(250);
    // Two completed docs → runCount = 2.
    expect(entry?.runCount).toBe(2);
  });

  it('if step: only one enter doc counted (enter+exit share stepId)', () => {
    // The engine writes exactly one doc per enter node.
    // Verifying the allow-list lets that one through and ignores absent stepType variants.
    const steps = { my_if: makeStepInfo('my_if', 'if') };
    const execs = [makeExec('my_if', 'if', 30)];
    const result = buildStepDurations(execs, steps);
    expect(result.get('my_if')).toEqual({
      totalMs: 30,
      runCount: 1,
      hasDuration: true,
      minMs: 30,
      maxMs: 30,
    });
  });

  it('zero-iteration loop: foreach/while always has runCount=1 (shows total)', () => {
    const steps = { my_loop: makeStepInfo('my_loop', 'foreach') };
    const execs = [makeExec('my_loop', 'foreach', 5)]; // Loop ran but had 0 iterations.
    const result = buildStepDurations(execs, steps);
    const entry = result.get('my_loop');
    expect(entry?.runCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// formatStepDurationLabel
// ---------------------------------------------------------------------------

describe('formatStepDurationLabel', () => {
  it('returns empty string when hasDuration is false', () => {
    expect(
      formatStepDurationLabel({ totalMs: 0, runCount: 1, hasDuration: false, minMs: 0, maxMs: 0 })
    ).toBe('');
  });

  it('formats a single run', () => {
    const label = formatStepDurationLabel({
      totalMs: 120,
      runCount: 1,
      hasDuration: true,
      minMs: 120,
      maxMs: 120,
    });
    expect(label).toBe('120ms');
  });

  it('trims trailing space from formatDuration', () => {
    const label = formatStepDurationLabel({
      totalMs: 1000,
      runCount: 1,
      hasDuration: true,
      minMs: 1000,
      maxMs: 1000,
    });
    expect(label).toBe('1s');
  });

  it('formats repeated runs as ~avg (tilde prefix, no run count in the chip)', () => {
    const label = formatStepDurationLabel({
      totalMs: 867,
      runCount: 3,
      hasDuration: true,
      minMs: 289,
      maxMs: 289,
    });
    // avg = Math.round(867/3) = 289ms; chip shows ~289ms, run count is in the hover tooltip only.
    expect(label).toContain('~');
    expect(label).toContain('289ms');
    expect(label).not.toContain('3'); // run count is NOT in the chip label
    expect(label).not.toContain('×');
  });

  it('rounds the average to the nearest millisecond', () => {
    // 100ms total, 3 runs → avg = Math.round(100/3) = 33ms
    const label = formatStepDurationLabel({
      totalMs: 100,
      runCount: 3,
      hasDuration: true,
      minMs: 33,
      maxMs: 34,
    });
    expect(label).toContain('33ms');
  });
});

// ---------------------------------------------------------------------------
// getStepDurationTone
// ---------------------------------------------------------------------------

describe('getStepDurationTone', () => {
  it('returns none when denominatorMs is 0 (run in flight)', () => {
    expect(getStepDurationTone(1000, 0)).toBe('none');
  });

  it('returns none when denominatorMs is negative', () => {
    expect(getStepDurationTone(1000, -1)).toBe('none');
  });

  it('returns none below the warning threshold (< 40%)', () => {
    expect(getStepDurationTone(390, 1000)).toBe('none');
  });

  it('returns warning at exactly 40%', () => {
    expect(getStepDurationTone(400, 1000)).toBe('warning');
  });

  it('returns warning between 40% and 70%', () => {
    expect(getStepDurationTone(600, 1000)).toBe('warning');
  });

  it('returns danger at exactly 70%', () => {
    expect(getStepDurationTone(700, 1000)).toBe('danger');
  });

  it('returns danger above 70%', () => {
    expect(getStepDurationTone(900, 1000)).toBe('danger');
  });

  it('clamps ratio at 1 when totalMs exceeds denominator', () => {
    // totalMs > denominator can happen when children run in parallel.
    expect(getStepDurationTone(2000, 1000)).toBe('danger');
  });
});

// ---------------------------------------------------------------------------
// getDurationGutterWidth
// ---------------------------------------------------------------------------

describe('getDurationGutterWidth', () => {
  it('returns the floor for an empty label set', () => {
    // 0 chars: ceil(0 * 6.6) + 6 = 6 < 34 floor → 34.
    expect(getDurationGutterWidth([])).toBe(34);
  });

  it('returns the floor for short labels', () => {
    // '~1s' (3 chars): ceil(3 * 6.6) + 6 = 26 < 34 floor → 34.
    expect(getDurationGutterWidth(['~1s'])).toBe(34);
    // '<1ms' (4 chars): ceil(4 * 6.6) + 6 = 33 < 34 floor → 34.
    expect(getDurationGutterWidth(['<1ms'])).toBe(34);
  });

  it('returns a wider value for long labels', () => {
    // '~1m 30s' (7 chars): ceil(7 * 6.6) + 6 = 53 > 34 floor → 53.
    const w = getDurationGutterWidth(['~1m 30s']);
    expect(w).toBeGreaterThan(34);
    expect(w).toBeLessThanOrEqual(160);
  });

  it('caps at the ceiling', () => {
    const veryLong = 'x'.repeat(200);
    expect(getDurationGutterWidth([veryLong])).toBe(160);
  });

  it('uses the longest label when multiple are present', () => {
    const wShort = getDurationGutterWidth(['~1s']); // 3 chars → 34 (floor)
    const wLong = getDurationGutterWidth(['~1s', '~1m 30s']); // 7 chars → 53
    expect(wLong).toBeGreaterThan(wShort);
  });
});

// ---------------------------------------------------------------------------
// EMPTY_STEP_DURATIONS
// ---------------------------------------------------------------------------

describe('EMPTY_STEP_DURATIONS', () => {
  it('is an empty map', () => {
    expect(EMPTY_STEP_DURATIONS.size).toBe(0);
  });

  it('is the same reference every import (referentially stable)', () => {
    // Referential stability means Redux createSelector sees the same value on every idle tick.
    expect(EMPTY_STEP_DURATIONS).toBe(EMPTY_STEP_DURATIONS);
  });
});
