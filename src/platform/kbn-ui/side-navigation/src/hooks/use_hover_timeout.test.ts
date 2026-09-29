/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { act, renderHook } from '@testing-library/react';

import { useHoverTimeout } from './use_hover_timeout';

describe('useHoverTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  it('runs the callback after the specified delay', () => {
    const { result } = renderHook(() => useHoverTimeout());

    const callback = vi.fn();

    act(() => {
      result.current.setHoverTimeout(callback, 200);
    });

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('clears pending timeouts on demand and during cleanup', () => {
    const { result, unmount } = renderHook(() => useHoverTimeout());

    const callback = vi.fn();

    act(() => {
      result.current.setHoverTimeout(callback, 200);
      result.current.clearHoverTimeout();
    });

    vi.advanceTimersByTime(200);

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      result.current.setHoverTimeout(callback, 200);
    });

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
