/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ADMISSION_LIMITS, ROLLING_HOUR_MS, WriteAdmission } from './admission';

describe('WriteAdmission', () => {
  it('uses separate limits per phase by default', () => {
    expect(ADMISSION_LIMITS).toEqual({
      starting: { perHour: 5, minGrowth: 1, maxFiles: 10 },
      running: { perHour: 5, minGrowth: 1.25, maxFiles: 100 },
    });
    expect(ROLLING_HOUR_MS).toBe(3_600_000);
  });

  it('admits the first perHour captures in the rolling hour', () => {
    const admission = new WriteAdmission();
    for (let i = 0; i < 5; i++) {
      expect(admission.admit('running', 300 + i, i)).toBe('admitted');
    }
    expect(admission.admit('running', 301, 5)).toBe('in_window');
  });

  it('counts an admitted capture at once, so a failed write still uses its slot', () => {
    const admission = new WriteAdmission();
    // Nothing is reported back after admission, as when every write fails.
    for (let i = 0; i < 5; i++) {
      admission.admit('running', 400, i);
    }
    expect(admission.admit('running', 400, 5)).toBe('in_window');
    // The record moved too: 400 * 1.25 = 500.
    expect(admission.admit('running', 500, 6)).toBe('in_window');
  });

  it('admits a running record above 1.25 times the longest when the rolling hour is full', () => {
    const admission = new WriteAdmission();
    for (let i = 0; i < 5; i++) {
      admission.admit('running', 400, i);
    }
    // 400 * 1.25 = 500; 500 is not above it, 501 is.
    expect(admission.admit('running', 500, 6)).toBe('in_window');
    expect(admission.admit('running', 501, 7)).toBe('admitted');
  });

  it('admits a startup record that is longer than the longest', () => {
    const admission = new WriteAdmission();
    for (let i = 0; i < 5; i++) {
      admission.admit('starting', 400, i);
    }
    expect(admission.admit('starting', 400, 5)).toBe('in_window');
    expect(admission.admit('starting', 401, 6)).toBe('admitted');
  });

  it('frees the allowance as admissions age out of the rolling hour', () => {
    const admission = new WriteAdmission();
    for (let i = 0; i < 5; i++) {
      admission.admit('running', 400, i);
    }
    expect(admission.admit('running', 300, 10)).toBe('in_window');
    // The first admission (t=0) has aged out, leaving four.
    expect(admission.admit('running', 300, ROLLING_HOUR_MS + 1)).toBe('admitted');
  });

  it('keeps the rolling hour and record separate per phase', () => {
    const admission = new WriteAdmission();
    for (let i = 0; i < 5; i++) {
      admission.admit('starting', 1_000, i);
    }
    expect(admission.admit('starting', 1_000, 5)).toBe('in_window');
    // Running has its own allowance, and startup's 1,000ms blocks don't raise its record.
    for (let i = 0; i < 5; i++) {
      expect(admission.admit('running', 300, 5 + i)).toBe('admitted');
    }
    expect(admission.admit('running', 376, 10)).toBe('admitted');
  });

  it('keeps the file cap separate per phase', () => {
    const admission = new WriteAdmission({
      starting: { ...ADMISSION_LIMITS.starting, maxFiles: 2 },
      running: { ...ADMISSION_LIMITS.running, maxFiles: 1 },
    });
    expect(admission.admit('starting', 300, 0)).toBe('admitted');
    expect(admission.admit('starting', 300, 1)).toBe('admitted');
    expect(admission.admit('starting', 300, 2)).toBe('file_limit');
    // Startup's files don't count toward the running cap.
    expect(admission.admit('running', 300, 3)).toBe('admitted');
    expect(admission.admit('running', 300, 4)).toBe('file_limit');
  });

  it('stops at maxFiles regardless of the rolling hour or a record', () => {
    const admission = new WriteAdmission({
      ...ADMISSION_LIMITS,
      running: { ...ADMISSION_LIMITS.running, perHour: 10, maxFiles: 2 },
    });
    expect(admission.admit('running', 200, 0)).toBe('admitted');
    expect(admission.admit('running', 300, 1)).toBe('admitted');
    expect(admission.admit('running', 10_000, 2)).toBe('file_limit');
  });

  it('decides the same with records admitted beyond perHour in the rolling hour', () => {
    const admission = new WriteAdmission();
    // Five admissions, then three records, all within the hour.
    for (let i = 0; i < 5; i++) {
      admission.admit('running', 400, i);
    }
    expect(admission.admit('running', 501, 5)).toBe('admitted');
    expect(admission.admit('running', 627, 6)).toBe('admitted');
    expect(admission.admit('running', 784, 7)).toBe('admitted');
    expect(admission.admit('running', 300, 8)).toBe('in_window');
    // Once t=0..2 age out, five admissions (t=3..7) are still in the hour.
    expect(admission.admit('running', 300, ROLLING_HOUR_MS + 2)).toBe('in_window');
    // Once t=3 ages out too, four are left.
    expect(admission.admit('running', 300, ROLLING_HOUR_MS + 3)).toBe('admitted');
  });

  it('changes nothing when a capture is not admitted', () => {
    const admission = new WriteAdmission();
    for (let i = 0; i < 5; i++) {
      admission.admit('running', 400, i);
    }
    expect(admission.admit('running', 400, 10)).toBe('in_window');
    expect(admission.admit('running', 400, 10)).toBe('in_window');
    expect(admission.admit('running', 501, 11)).toBe('admitted');
  });
});
