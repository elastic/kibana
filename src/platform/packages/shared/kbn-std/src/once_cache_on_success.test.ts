/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fc } from '@fast-check/jest';
import { onceCacheOnSuccess } from './once_cache_on_success';

describe('onceCacheOnSuccess', () => {
  it('calls the factory once and caches the result on success', () => {
    const factory = jest.fn(() => ({ value: 'success' }));
    const memoized = onceCacheOnSuccess(factory);

    const result1 = memoized();
    const result2 = memoized();
    const result3 = memoized();

    expect(factory).toHaveBeenCalledTimes(1);
    expect(result1).toEqual({ value: 'success' });
    expect(result2).toEqual({ value: 'success' });
    expect(result3).toEqual({ value: 'success' });
    expect(result1).toBe(result2);
    expect(result2).toBe(result3);
  });

  it('retries on failure instead of caching undefined', () => {
    let attemptCount = 0;
    const factory = jest.fn(() => {
      attemptCount++;
      if (attemptCount < 3) {
        throw new Error(`Attempt ${attemptCount} failed`);
      }
      return { value: 'success' };
    });

    const memoized = onceCacheOnSuccess(factory);

    // First two calls throw
    expect(() => memoized()).toThrow('Attempt 1 failed');
    expect(() => memoized()).toThrow('Attempt 2 failed');

    // Third call succeeds
    const result = memoized();
    expect(result).toEqual({ value: 'success' });

    // Fourth call returns cached result
    const cachedResult = memoized();
    expect(cachedResult).toEqual({ value: 'success' });
    expect(cachedResult).toBe(result);

    // Factory was called 3 times (not more)
    expect(factory).toHaveBeenCalledTimes(3);
  });

  it('consistently retries when factory always throws', () => {
    const factory = jest.fn(() => {
      throw new Error('Always fails');
    });

    const memoized = onceCacheOnSuccess(factory);

    for (let i = 0; i < 5; i++) {
      expect(() => memoized()).toThrow('Always fails');
    }

    expect(factory).toHaveBeenCalledTimes(5);
  });

  it('property: caches any successful value and calls factory exactly once', () => {
    fc.assert(
      fc.property(fc.anything(), fc.integer({ min: 1, max: 10 }), (value, callCount) => {
        const factory = jest.fn(() => value);
        const memoized = onceCacheOnSuccess(factory);

        const results = Array.from({ length: callCount }, () => memoized());

        expect(factory).toHaveBeenCalledTimes(1);
        // All results are the same reference
        expect(results.every((r) => r === results[0])).toBe(true);
      })
    );
  });

  it('property: throws K times then caches on success, factory called exactly K+1 times', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 5 }), fc.anything(), (failCount, successValue) => {
        let calls = 0;
        const factory = jest.fn(() => {
          calls++;
          if (calls <= failCount) {
            throw new Error(`fail ${calls}`);
          }
          return successValue;
        });

        const memoized = onceCacheOnSuccess(factory);

        // Exhaust the failures
        for (let i = 0; i < failCount; i++) {
          expect(() => memoized()).toThrow();
        }

        // Next call succeeds
        const result = memoized();
        expect(result).toBe(successValue);

        // Subsequent calls return cached value, factory not called again
        expect(memoized()).toBe(successValue);
        expect(factory).toHaveBeenCalledTimes(failCount + 1);
      })
    );
  });
});
