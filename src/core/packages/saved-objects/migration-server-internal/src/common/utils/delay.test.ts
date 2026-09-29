/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { createDelayFn } from './delay';

const nextTick = () => new Promise<void>((resolve) => resolve());

describe('createDelayFn', () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('adds a delay effect to the provided function', async () => {
    const handler = vi.fn();

    const wrapped = createDelayFn({ retryDelay: 2000, retryCount: 0 })(handler);

    wrapped();

    expect(handler).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    await nextTick();

    expect(handler).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1500);
    await nextTick();

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
