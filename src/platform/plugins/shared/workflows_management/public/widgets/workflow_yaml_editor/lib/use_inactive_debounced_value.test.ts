/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import { useInactiveDebouncedValue } from './use_inactive_debounced_value';

const DELAY = 300;

const setup = (initial: { value: string; isActive: boolean }) =>
  renderHook(({ value, isActive }) => useInactiveDebouncedValue(value, isActive, DELAY), {
    initialProps: initial,
  });

describe('useInactiveDebouncedValue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns every value at once while active', () => {
    const { result, rerender } = setup({ value: 'a', isActive: true });
    rerender({ value: 'ab', isActive: true });
    expect(result.current).toBe('ab');
    rerender({ value: 'abc', isActive: true });
    expect(result.current).toBe('abc');
  });

  it('holds the previous value while inactive and settles after the delay', () => {
    const { result, rerender } = setup({ value: 'a', isActive: false });
    rerender({ value: 'ab', isActive: false });
    expect(result.current).toBe('a');

    act(() => {
      jest.advanceTimersByTime(DELAY - 1);
    });
    expect(result.current).toBe('a');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('ab');
  });

  it('settles once on the latest value after a burst of changes, restarting the wait on each', () => {
    const { result, rerender } = setup({ value: 'a', isActive: false });
    rerender({ value: 'ab', isActive: false });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    rerender({ value: 'abc', isActive: false });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    // 400 ms after the first change, but only 200 ms after the last one.
    expect(result.current).toBe('a');

    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe('abc');
  });

  it('shows the latest value immediately when it becomes active', () => {
    const { result, rerender } = setup({ value: 'a', isActive: false });
    rerender({ value: 'ab', isActive: false });
    expect(result.current).toBe('a');

    rerender({ value: 'ab', isActive: true });
    expect(result.current).toBe('ab');
  });

  it('does not fall back to an older value when it becomes inactive again', () => {
    const { result, rerender } = setup({ value: 'a', isActive: true });
    rerender({ value: 'ab', isActive: true });
    rerender({ value: 'abc', isActive: true });

    rerender({ value: 'abc', isActive: false });
    expect(result.current).toBe('abc');

    act(() => {
      jest.advanceTimersByTime(DELAY * 2);
    });
    expect(result.current).toBe('abc');
  });

  it('does not schedule an update when the value did not change', () => {
    const { rerender } = setup({ value: 'a', isActive: false });
    const timersBefore = jest.getTimerCount();
    rerender({ value: 'a', isActive: false });
    expect(jest.getTimerCount()).toBe(timersBefore);
  });

  it('drops a pending update on unmount', () => {
    const { rerender, unmount } = setup({ value: 'a', isActive: false });
    const timersBefore = jest.getTimerCount();
    rerender({ value: 'ab', isActive: false });
    expect(jest.getTimerCount()).toBe(timersBefore + 1);
    unmount();
    expect(jest.getTimerCount()).toBe(timersBefore);
  });
});
