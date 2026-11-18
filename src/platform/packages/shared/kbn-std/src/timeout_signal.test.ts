/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { timeoutSignal } from './timeout_signal';

const activeTimeoutHandles = () => {
  const handles = (
    process as NodeJS.Process & {
      _getActiveHandles: () => Array<{ constructor?: { name?: string } } | null | undefined>;
    }
  )._getActiveHandles();
  return handles.filter((handle) => handle?.constructor?.name === 'Timeout');
};

describe('timeoutSignal', () => {
  it('aborts with TimeoutError when the deadline is reached', async () => {
    const signal = timeoutSignal(20);
    try {
      await new Promise<void>((resolve, reject) => {
        signal.addEventListener('abort', () => {
          try {
            expect(signal.aborted).toBe(true);
            expect(signal.reason).toMatchObject({
              name: 'TimeoutError',
              message: 'The operation was aborted due to timeout',
            });
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    } finally {
      signal.dispose();
    }
  });

  it('does not abort after dispose', async () => {
    const signal = timeoutSignal(20);
    try {
      signal.dispose();
      signal.dispose();
      await new Promise((resolve) => setTimeout(resolve, 40));
      expect(signal.aborted).toBe(false);
    } finally {
      signal.dispose();
    }
  });

  it('clears the timer when dispose runs before the deadline', async () => {
    let signal: AbortSignal;
    {
      const deadline = timeoutSignal(30);
      try {
        signal = deadline;
        expect(signal.aborted).toBe(false);
      } finally {
        deadline.dispose();
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(signal.aborted).toBe(false);
  });

  it('does not keep the process alive while the deadline is pending', () => {
    const before = activeTimeoutHandles().length;
    const signal = timeoutSignal(60_000);
    try {
      expect(activeTimeoutHandles().length).toBe(before);
    } finally {
      signal.dispose();
    }
  });

  it('rejects a delay AbortSignal.timeout would reject', () => {
    const rejectDelay = (delay: number) => {
      const signal = timeoutSignal(delay);
      try {
        return signal.aborted;
      } finally {
        signal.dispose();
      }
    };

    expect(() => rejectDelay(-1)).toThrow(RangeError);
    expect(() => rejectDelay(1.5)).toThrow(RangeError);
    expect(() => rejectDelay(Number.NaN)).toThrow(RangeError);
    expect(() => rejectDelay(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => rejectDelay(JSON.parse('"10"'))).toThrow(TypeError);
  });

  it('rejects delays Node would clamp to 1ms', () => {
    const rejectDelay = (delay: number) => {
      const signal = timeoutSignal(delay);
      try {
        return signal.aborted;
      } finally {
        signal.dispose();
      }
    };

    expect(() => rejectDelay(2 ** 31)).toThrow(RangeError);
    expect(() => rejectDelay(2 ** 32 - 1)).toThrow(RangeError);
    expect(rejectDelay(2 ** 31 - 1)).toBe(false);
  });
});
