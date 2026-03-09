/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cycleTimestamp } from './tick';

const T0 = 1_000_000; // arbitrary non-zero epoch offset (ms)
const CYCLE_MS = 60_000; // 60 s cycle

const t = (offsetMs: number) => T0 + offsetMs;

describe('cycleTimestamp', () => {
  it('returns ts unchanged when before origin', () => {
    expect(cycleTimestamp(T0 - 1, CYCLE_MS, T0)).toBe(T0 - 1);
  });

  it('returns origin for ts === origin', () => {
    expect(cycleTimestamp(T0, CYCLE_MS, T0)).toBe(T0);
  });

  it('does not wrap ts within the first cycle', () => {
    expect(cycleTimestamp(t(40_000), CYCLE_MS, T0)).toBe(t(40_000));
  });

  it('wraps ts that has crossed one cycle boundary', () => {
    expect(cycleTimestamp(t(CYCLE_MS + 40_000), CYCLE_MS, T0)).toBe(t(40_000));
  });

  it('wraps ts that has crossed multiple cycle boundaries', () => {
    expect(cycleTimestamp(t(3 * CYCLE_MS + 40_000), CYCLE_MS, T0)).toBe(t(40_000));
  });

  it('spike window fires on every cycle iteration and not outside it', () => {
    const SPIKE_START = t(40_000); // 40 s into cycle
    const SPIKE_END = t(50_000); // 50 s into cycle

    const inWindow = (ts: number) => {
      const cycled = cycleTimestamp(ts, CYCLE_MS, T0);
      return cycled >= SPIKE_START && cycled < SPIKE_END;
    };

    expect(inWindow(t(45_000))).toBe(true); // first cycle, inside window
    expect(inWindow(t(CYCLE_MS + 45_000))).toBe(true); // second cycle, inside window
    expect(inWindow(t(55_000))).toBe(false); // first cycle, after window
    expect(inWindow(t(CYCLE_MS + 55_000))).toBe(false); // second cycle, after window
  });
});
