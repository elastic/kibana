/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Phase } from './types';
import { ADMISSION_LIMITS, WriteAdmission } from './admission';

const HOUR_MS = ADMISSION_LIMITS.rollingHourMs;

/** Admits and, on a write, records at the same time, returning the outcome. */
const admitWrite = (admission: WriteAdmission, phase: Phase, blockedMs: number, nowMs: number) => {
  const outcome = admission.admit(phase, blockedMs, nowMs);
  if (outcome === 'written') {
    admission.recordWritten(phase, blockedMs, nowMs);
  }
  return outcome;
};

describe('WriteAdmission', () => {
  it('uses the MVP limits by default', () => {
    expect(ADMISSION_LIMITS).toEqual({
      perHour: 5,
      minGrowth: 1.25,
      maxFiles: 100,
      rollingHourMs: 3_600_000,
    });
  });

  it('writes the first perHour captures in the rolling hour', () => {
    const admission = new WriteAdmission();
    for (let i = 0; i < 5; i++) {
      expect(admitWrite(admission, 'running', 300 + i, i)).toBe('written');
    }
    expect(admitWrite(admission, 'running', 301, 5)).toBe('in_window');
  });

  it('writes a record even when the rolling hour is full', () => {
    const admission = new WriteAdmission();
    for (let i = 0; i < 5; i++) {
      admitWrite(admission, 'running', 400, i);
    }
    // 400 * 1.25 = 500; 500 is not above the bar, 501 is.
    expect(admitWrite(admission, 'running', 500, 6)).toBe('in_window');
    expect(admitWrite(admission, 'running', 501, 7)).toBe('written');
  });

  it('frees the allowance as writes age out of the rolling hour', () => {
    const admission = new WriteAdmission();
    for (let i = 0; i < 5; i++) {
      admitWrite(admission, 'running', 400, i);
    }
    expect(admission.admit('running', 300, 10)).toBe('in_window');
    // The first write (t=0) has aged out, leaving four, so a write is allowed again.
    expect(admitWrite(admission, 'running', 300, HOUR_MS + 1)).toBe('written');
  });

  it('keeps the rolling hour and record separate per phase', () => {
    const admission = new WriteAdmission();
    for (let i = 0; i < 5; i++) {
      admitWrite(admission, 'starting', 1_000, i);
    }
    expect(admission.admit('starting', 1_000, 5)).toBe('in_window');
    // Running has its own allowance, and its record bar isn't raised by startup's 1,000ms blocks.
    for (let i = 0; i < 5; i++) {
      expect(admitWrite(admission, 'running', 300, 5 + i)).toBe('written');
    }
    expect(admitWrite(admission, 'running', 376, 10)).toBe('written');
  });

  it('counts startup files toward maxFiles', () => {
    const admission = new WriteAdmission({ ...ADMISSION_LIMITS, maxFiles: 3 });
    expect(admitWrite(admission, 'starting', 300, 0)).toBe('written');
    expect(admitWrite(admission, 'starting', 300, 1)).toBe('written');
    expect(admitWrite(admission, 'running', 300, 2)).toBe('written');
    expect(admission.admit('starting', 300, 3)).toBe('file_limit');
    expect(admission.admit('running', 300, 3)).toBe('file_limit');
  });

  it('decides the same with records written beyond perHour in the rolling hour', () => {
    const admission = new WriteAdmission();
    // Five writes, then three records, all within the hour.
    for (let i = 0; i < 5; i++) {
      admitWrite(admission, 'running', 400, i);
    }
    expect(admitWrite(admission, 'running', 501, 5)).toBe('written');
    expect(admitWrite(admission, 'running', 627, 6)).toBe('written');
    expect(admitWrite(admission, 'running', 784, 7)).toBe('written');
    expect(admission.admit('running', 300, 8)).toBe('in_window');
    // Once t=0..2 age out, five writes (t=3..7) are still in the hour.
    expect(admission.admit('running', 300, HOUR_MS + 2)).toBe('in_window');
    // Once t=3 ages out too, four are left.
    expect(admission.admit('running', 300, HOUR_MS + 3)).toBe('written');
  });

  it('stops at maxFiles regardless of the rolling hour', () => {
    const admission = new WriteAdmission({ ...ADMISSION_LIMITS, perHour: 10, maxFiles: 2 });
    expect(admitWrite(admission, 'running', 200, 0)).toBe('written');
    expect(admitWrite(admission, 'running', 300, 1)).toBe('written');
    expect(admission.admit('running', 400, 2)).toBe('file_limit');
  });

  it('uses none of the allowance unless recordWritten is called', () => {
    const admission = new WriteAdmission();
    for (let i = 0; i < 6; i++) {
      expect(admission.admit('running', 400, i)).toBe('written');
    }
  });

  it('gives the same decision on repeated admit calls', () => {
    const admission = new WriteAdmission();
    for (let i = 0; i < 5; i++) {
      admission.recordWritten('running', 400, i);
    }
    expect(admission.admit('running', 400, 10)).toBe('in_window');
    expect(admission.admit('running', 400, 10)).toBe('in_window');
  });
});
