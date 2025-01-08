/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Cache } from './cache';

describe('Cache', () => {
  beforeEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });
  it('stores value for maxAge ms', async () => {
    const cache = new Cache<number>(500);
    cache.set(42);
    expect(cache.get()).toBe(42);
    jest.advanceTimersByTime(100);
    expect(cache.get()).toBe(42);
  });
  it('invalidates cache after maxAge ms', async () => {
    const cache = new Cache<number>(500);
    cache.set(42);
    expect(cache.get()).toBe(42);
    jest.advanceTimersByTime(1000);
    expect(cache.get()).toBe(null);
  });
  it('del invalidates cache immediately', async () => {
    const cache = new Cache<number>(10);
    cache.set(42);
    expect(cache.get()).toBe(42);
    cache.del();
    expect(cache.get()).toBe(null);
  });
});
