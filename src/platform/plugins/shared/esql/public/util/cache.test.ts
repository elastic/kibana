/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cacheNonParametrizedAsyncFunction, cacheParametrizedAsyncFunction } from './cache';

describe('cacheNonParametrizedAsyncFunction', () => {
  it('returns the value returned by the original function', async () => {
    const fn = jest.fn().mockResolvedValue('value');
    const cached = cacheNonParametrizedAsyncFunction(fn);
    const value = await cached();

    expect(value).toBe('value');
  });

  it('immediate consecutive calls do not call the original function', async () => {
    const fn = jest.fn().mockResolvedValue('value');
    const cached = cacheNonParametrizedAsyncFunction(fn);
    const value1 = await cached();

    expect(fn.mock.calls.length).toBe(1);

    const value2 = await cached();

    expect(fn.mock.calls.length).toBe(1);

    const value3 = await cached();

    expect(fn.mock.calls.length).toBe(1);

    expect(value1).toBe('value');
    expect(value2).toBe('value');
    expect(value3).toBe('value');
  });

  it('immediate consecutive synchronous calls do not call the original function', async () => {
    const fn = jest.fn().mockResolvedValue('value');
    const cached = cacheNonParametrizedAsyncFunction(fn);
    const value1 = cached();
    const value2 = cached();
    const value3 = cached();

    expect(fn.mock.calls.length).toBe(1);
    expect(await value1).toBe('value');
    expect(await value2).toBe('value');
    expect(await value3).toBe('value');
    expect(fn.mock.calls.length).toBe(1);
  });

  it('does not call original function if cached value is fresh enough', async () => {
    let time = 1;
    let value = 'value1';
    const now = jest.fn(() => time);
    const fn = jest.fn(async () => value);
    const cached = cacheNonParametrizedAsyncFunction(fn, 100, 20, now);

    const value1 = await cached();

    expect(fn.mock.calls.length).toBe(1);
    expect(value1).toBe('value1');

    time = 10;
    value = 'value2';

    const value2 = await cached();

    expect(fn.mock.calls.length).toBe(1);
    expect(value2).toBe('value1');
  });

  it('immediately returns cached value, but calls original function when sufficient time passed', async () => {
    let time = 1;
    let value = 'value1';
    const now = jest.fn(() => time);
    const fn = jest.fn(async () => value);
    const cached = cacheNonParametrizedAsyncFunction(fn, 100, 20, now);

    const value1 = await cached();

    expect(fn.mock.calls.length).toBe(1);
    expect(value1).toBe('value1');

    time = 30;
    value = 'value2';

    const value2 = await cached();

    expect(fn.mock.calls.length).toBe(2);
    expect(value2).toBe('value1');

    time = 50;
    value = 'value3';

    const value3 = await cached();

    expect(fn.mock.calls.length).toBe(2);
    expect(value3).toBe('value2');
  });

  it('blocks and refreshes the value when cache expires', async () => {
    let time = 1;
    let value = 'value1';
    const now = jest.fn(() => time);
    const fn = jest.fn(async () => value);
    const cached = cacheNonParametrizedAsyncFunction(fn, 100, 20, now);

    const value1 = await cached();

    expect(fn.mock.calls.length).toBe(1);
    expect(value1).toBe('value1');

    time = 130;
    value = 'value2';

    const value2 = await cached();

    expect(fn.mock.calls.length).toBe(2);
    expect(value2).toBe('value2');
  });

  it('blocks and refreshes the value when forceRefresh flag is set', async () => {
    let time = 1;
    let value = 'value1';
    const now = jest.fn(() => time);
    const fn = jest.fn(async () => value);
    const cached = cacheNonParametrizedAsyncFunction(fn, 100, 20, now);

    const value1 = await cached();

    expect(fn.mock.calls.length).toBe(1);
    expect(value1).toBe('value1');

    time = 5;
    value = 'value2';

    // Force refresh should call the original function
    const value2 = await cached({ forceRefresh: true });

    expect(fn.mock.calls.length).toBe(2);
    expect(value2).toBe('value2');
  });
});

describe('cacheParametrizedAsyncFunction', () => {
  let mockNow: jest.Mock<number, []>; // Mock function for Date.now

  beforeEach(() => {
    mockNow = jest.fn();
    mockNow.mockReturnValue(0);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers(); // Clear any pending timers
    jest.useRealTimers(); // Restore real timers
  });

  // Helper to advance time in tests
  const advanceTime = (ms: number) => {
    mockNow.mockReturnValue(mockNow() + ms);
    jest.advanceTimersByTime(ms);
  };

  it('should call the function and cache the result on the first call', async () => {
    const fn = jest.fn().mockResolvedValue('value');
    const cachedFn = cacheParametrizedAsyncFunction(fn);

    const value = await cachedFn();

    expect(value).toBe('value');
  });

  it('should return the cached value for subsequent calls with the same arguments within maxCacheDuration', async () => {
    const fn = jest.fn().mockResolvedValue('first_value');
    const cachedFn = cacheParametrizedAsyncFunction(fn, undefined, undefined, undefined, mockNow);

    await cachedFn('argA', 1); // First call, caches 'first_value'

    fn.mockResolvedValueOnce('second_value'); // This should not be called
    const result = await cachedFn('argA', 1); // Second call, should return cached

    expect(result).toBe('first_value');
    expect(fn).toHaveBeenCalledTimes(1); // Still only one call to original function
  });

  it('should call the function again if maxCacheDuration expires', async () => {
    const fn = jest.fn().mockResolvedValue('first_value');
    const maxCacheDuration = 1000; // 1 second
    const cachedFn = cacheParametrizedAsyncFunction(
      fn,
      undefined,
      maxCacheDuration,
      undefined,
      mockNow
    );

    await cachedFn('argB', 2);
    expect(fn).toHaveBeenCalledTimes(1);

    advanceTime(maxCacheDuration + 1); // Advance time just past maxCacheDuration

    fn.mockResolvedValueOnce('expired_value');
    const result = await cachedFn('argB', 2);

    expect(result).toBe('expired_value');
    expect(fn).toHaveBeenCalledTimes(2); // Should have called again
  });

  it('should use the provided getKey function for caching', async () => {
    const fn = jest.fn().mockResolvedValue('value_for_key');
    const customGetKey = (a: string, b: number) => `${a}-${b * 2}`;
    const cachedFn = cacheParametrizedAsyncFunction(
      fn,
      customGetKey,
      undefined,
      undefined,
      mockNow
    );

    await cachedFn('keyPartA', 5);
    expect(fn).toHaveBeenCalledWith('keyPartA', 5);

    fn.mockResolvedValueOnce('this_should_not_be_called');
    // Call with arguments that produce the same key
    const result = await cachedFn('keyPartA', 5);

    expect(result).toBe('value_for_key');
    expect(fn).toHaveBeenCalledTimes(1); // Still one call because key is the same
  });

  it('should trigger a background refresh if refreshAfter expires', async () => {
    const fn = jest.fn().mockResolvedValue('initial_value');
    const maxCacheDuration = 1000 * 60 * 5; // 5 minutes
    const refreshAfter = 1000 * 15; // 15 seconds

    const cachedFn = cacheParametrizedAsyncFunction(
      fn,
      undefined,
      maxCacheDuration,
      refreshAfter,
      mockNow
    );

    const firstResult = await cachedFn('argC', 3); // Caches 'initial_value'
    expect(firstResult).toBe('initial_value');
    expect(fn).toHaveBeenCalledTimes(1);

    advanceTime(refreshAfter + 1); // Advance time just past refreshAfter

    // Call should return the *old* value immediately, but trigger a background refresh
    fn.mockResolvedValueOnce('refreshed_value');
    const secondResult = await cachedFn('argC', 3);
    expect(secondResult).toBe('initial_value'); // Should still be the initial value

    // Allow the background refresh promise to resolve
    await Promise.resolve(); // Resolves the `.then` callback
    await Promise.resolve(); // Resolves the async function itself
    jest.runAllTimers();

    // Now, a subsequent call should reflect the refreshed value
    const thirdResult = await cachedFn('argC', 3);
    expect(thirdResult).toBe('refreshed_value');
    expect(fn).toHaveBeenCalledTimes(2); // Now fn has been called for refresh
  });

  it('should bypass and update the cache when function context has force refresh set to true', async () => {
    const fn = jest.fn().mockResolvedValue('initial_value');
    const maxCacheDuration = 1000 * 60 * 5; // 5 minutes
    const refreshAfter = 1000 * 15; // 15 seconds

    const cachedFn = cacheParametrizedAsyncFunction(
      fn,
      undefined,
      maxCacheDuration,
      refreshAfter,
      mockNow
    );

    const firstResult = await cachedFn('argC', 3); // Caches 'initial_value'
    expect(firstResult).toBe('initial_value');
    expect(fn).toHaveBeenCalledTimes(1);

    fn.mockResolvedValueOnce('new_value');

    const secondResult = await cachedFn('argC', 3); // Caches 'initial_value'
    expect(secondResult).toBe('initial_value');
    expect(fn).toHaveBeenCalledTimes(1);

    const forcedResult = await cachedFn.call({ forceRefresh: true }, 'argC', 3); // Caches 'initial_value'
    expect(forcedResult).toBe('new_value');
    expect(fn).toHaveBeenCalledTimes(2);

    const finalResult = await cachedFn('argC', 3);
    expect(finalResult).toBe('new_value');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
