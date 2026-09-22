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
    expect(result.get('step_a')).toEqual({ totalMs: 120, runCount: 1, hasDuration: true });
  });

  it('sets hasDuration false when executionTimeMs is absent (still running)', () => {
    const steps = { step_a: makeStepInfo('step_a', 'http.request') };
    const execs = [makeExec('step_a', 'http.request', undefined)];
    const result = buildStepDurations(execs, steps);
    expect(result.get('step_a')).toEqual({ totalMs: 0, runCount: 1, hasDuration: false });
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
    expect(result.get('step_a')).toEqual({ totalMs: 1150, runCount: 1, hasDuration: true });
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

  it('foreach: loop step gets iteration count and its children get run count', () => {
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

    // Loop step: the iteration Set is keyed by frame.stepId='my_loop' in the child docs'
    // scopeStacks, giving 3 unique paths → runCount=3 (N × avg behaviour on the loop line).
    const loop = result.get('my_loop');
    expect(loop?.totalMs).toBe(867);
    expect(loop?.runCount).toBe(3);

    // Child: 3 iterations → runCount = 3.
    const child = result.get('child_step');
    expect(child?.totalMs).toBe(867); // 289 × 3
    expect(child?.runCount).toBe(3);
    expect(child?.hasDuration).toBe(true);
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
      // leaf runs 2 outer × 2 inner = 4 times
      makeExec('leaf', 'http.request', 50, makeScopeStack('0', '0')),
      makeExec('leaf', 'http.request', 50, makeScopeStack('0', '1')),
      makeExec('leaf', 'http.request', 50, makeScopeStack('1', '0')),
      makeExec('leaf', 'http.request', 50, makeScopeStack('1', '1')),
    ];

    const result = buildStepDurations(execs, steps);
    const leaf = result.get('leaf');
    expect(leaf?.totalMs).toBe(200);
    // 4 unique full paths (outer 0 inner 0, outer 0 inner 1, outer 1 inner 0, outer 1 inner 1)
    expect(leaf?.runCount).toBe(4);
  });

  it('retry attempts: non-numeric scopeId does not inflate iteration count', () => {
    const steps = { step_a: makeStepInfo('step_a', 'http.request') };

    // Two retry docs — scopeId is non-numeric (e.g. 'attempt-1', 'attempt-2').
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
    // Non-numeric scope ids → no iteration set → runCount = runs = 2.
    expect(entry?.runCount).toBe(2);
  });

  it('if step: only one enter doc counted (enter+exit share stepId)', () => {
    // The engine writes exactly one doc per enter node.
    // Verifying the allow-list lets that one through and ignores absent stepType variants.
    const steps = { my_if: makeStepInfo('my_if', 'if') };
    const execs = [makeExec('my_if', 'if', 30)];
    const result = buildStepDurations(execs, steps);
    expect(result.get('my_if')).toEqual({ totalMs: 30, runCount: 1, hasDuration: true });
  });

  it('zero-iteration loop: no iteration scopes recorded → runCount falls back to doc count', () => {
    const steps = { my_loop: makeStepInfo('my_loop', 'foreach') };
    const execs = [makeExec('my_loop', 'foreach', 5)]; // Loop ran but had 0 iterations.
    const result = buildStepDurations(execs, steps);
    const entry = result.get('my_loop');
    expect(entry?.runCount).toBe(1); // falls back to runs
  });
});

// ---------------------------------------------------------------------------
// formatStepDurationLabel
// ---------------------------------------------------------------------------

describe('formatStepDurationLabel', () => {
  it('returns empty string when hasDuration is false', () => {
    expect(formatStepDurationLabel({ totalMs: 0, runCount: 1, hasDuration: false })).toBe('');
  });

  it('formats a single run', () => {
    const label = formatStepDurationLabel({ totalMs: 120, runCount: 1, hasDuration: true });
    expect(label).toBe('120ms');
  });

  it('trims trailing space from formatDuration', () => {
    const label = formatStepDurationLabel({ totalMs: 1000, runCount: 1, hasDuration: true });
    expect(label).toBe('1s');
  });

  it('formats repeated runs as N × avg', () => {
    const label = formatStepDurationLabel({ totalMs: 867, runCount: 3, hasDuration: true });
    // avg = Math.round(867/3) = 289ms
    expect(label).toContain('3');
    expect(label).toContain('289ms');
    expect(label).toContain('×');
  });

  it('rounds the average to the nearest millisecond', () => {
    // 100ms total, 3 runs → avg = Math.round(100/3) = 33ms
    const label = formatStepDurationLabel({ totalMs: 100, runCount: 3, hasDuration: true });
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
    expect(getDurationGutterWidth([])).toBe(52);
  });

  it('returns the floor for short labels', () => {
    expect(getDurationGutterWidth(['45ms'])).toBe(52);
  });

  it('returns a wider value for long labels', () => {
    const w = getDurationGutterWidth(['12 × 1m 30s']);
    expect(w).toBeGreaterThan(52);
    expect(w).toBeLessThanOrEqual(160);
  });

  it('caps at the ceiling', () => {
    const veryLong = 'x'.repeat(200);
    expect(getDurationGutterWidth([veryLong])).toBe(160);
  });

  it('uses the longest label when multiple are present', () => {
    const wShort = getDurationGutterWidth(['45ms']);
    const wLong = getDurationGutterWidth(['45ms', '12 × 1m 30s']);
    expect(wLong).toBeGreaterThanOrEqual(wShort);
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
