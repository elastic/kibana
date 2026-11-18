/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WriteAdmission } from './admission';
import { ADMISSION_LIMITS, ROLLING_HOUR_MS } from './constants';
import type { Phase } from './types';

const { starting, running } = ADMISSION_LIMITS;
const BLOCKED_MS = 400;

/** Admits `perHour` captures of `blockedMs` at t = 0, 1, ... */
const fillHour = (admission: WriteAdmission, phase: Phase, blockedMs = BLOCKED_MS) => {
  for (let i = 0; i < ADMISSION_LIMITS[phase].perHour; i++) {
    expect(admission.admit(phase, blockedMs, i)).toBe('admitted');
  }
};

/** The shortest running block that's a record over `longestMs`. */
const runningRecord = (longestMs: number) => Math.floor(longestMs * running.minGrowth) + 1;

describe('WriteAdmission', () => {
  it('refuses a capture that is not a record once perHour are admitted in the rolling hour', () => {
    const admission = new WriteAdmission();
    fillHour(admission, 'running');
    expect(admission.admit('running', BLOCKED_MS, running.perHour)).toBe('in_window');
  });

  it('admits a running record above minGrowth times the longest, and a refusal changes nothing', () => {
    const admission = new WriteAdmission();
    fillHour(admission, 'running');
    const notRecord = BLOCKED_MS * running.minGrowth;
    expect(admission.admit('running', notRecord, running.perHour)).toBe('in_window');
    expect(admission.admit('running', notRecord, running.perHour)).toBe('in_window');
    expect(admission.admit('running', runningRecord(BLOCKED_MS), running.perHour)).toBe('admitted');
  });

  it('admits a startup record that is longer than the longest', () => {
    const admission = new WriteAdmission();
    fillHour(admission, 'starting');
    expect(admission.admit('starting', BLOCKED_MS, starting.perHour)).toBe('in_window');
    expect(admission.admit('starting', BLOCKED_MS + 1, starting.perHour)).toBe('admitted');
  });

  it('frees a slot when the first admission leaves the rolling hour', () => {
    const admission = new WriteAdmission();
    fillHour(admission, 'running');
    expect(admission.admit('running', BLOCKED_MS, ROLLING_HOUR_MS - 1)).toBe('in_window');
    expect(admission.admit('running', BLOCKED_MS, ROLLING_HOUR_MS)).toBe('admitted');
  });

  it('keeps the rolling hour and record separate per phase', () => {
    const admission = new WriteAdmission();
    fillHour(admission, 'starting', 2 * BLOCKED_MS);
    expect(admission.admit('starting', 2 * BLOCKED_MS, starting.perHour)).toBe('in_window');
    // Running has its own rolling hour, and startup's longer blocks do not raise the running
    // record.
    fillHour(admission, 'running');
    expect(admission.admit('running', runningRecord(BLOCKED_MS), running.perHour)).toBe('admitted');
  });

  it('keeps the file cap separate per phase', () => {
    const admission = new WriteAdmission({
      starting: { ...starting, maxFiles: 2 },
      running: { ...running, maxFiles: 1 },
    });
    expect(admission.admit('starting', 300, 0)).toBe('admitted');
    expect(admission.admit('starting', 300, 1)).toBe('admitted');
    expect(admission.admit('starting', 300, 2)).toBe('file_limit');
    expect(admission.admit('running', 300, 3)).toBe('admitted');
    expect(admission.admit('running', 300, 4)).toBe('file_limit');
  });

  it('stops at maxFiles regardless of the rolling hour or a record', () => {
    const admission = new WriteAdmission({
      ...ADMISSION_LIMITS,
      running: { ...running, perHour: 10, maxFiles: 2 },
    });
    expect(admission.admit('running', 200, 0)).toBe('admitted');
    expect(admission.admit('running', 300, 1)).toBe('admitted');
    expect(admission.admit('running', 10_000, 2)).toBe('file_limit');
  });

  it('decides the same with records admitted beyond perHour in the rolling hour', () => {
    const admission = new WriteAdmission();
    fillHour(admission, 'running');
    const records = 3;
    let longestMs = BLOCKED_MS;
    for (let i = 0; i < records; i++) {
      longestMs = runningRecord(longestMs);
      expect(admission.admit('running', longestMs, running.perHour + i)).toBe('admitted');
    }
    expect(admission.admit('running', BLOCKED_MS, running.perHour + records)).toBe('in_window');
    // Even after the first `records` admission timestamps expire, `perHour` remain in the hour.
    expect(admission.admit('running', BLOCKED_MS, ROLLING_HOUR_MS + records - 1)).toBe('in_window');
    // The next earliest timestamp expires, freeing a slot in the rolling-hour window.
    expect(admission.admit('running', BLOCKED_MS, ROLLING_HOUR_MS + records)).toBe('admitted');
  });
});
