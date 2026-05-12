/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';

import { useAutoRefresh } from './use_auto_refresh';

describe('useAutoRefresh', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows full interval countdown when initially paused', () => {
    const { result } = renderHook(() =>
      useAutoRefresh({ isPaused: true, intervalMs: 5000, onRefresh: jest.fn() })
    );

    expect(result.current.secondsRemaining).toBe(5);
  });

  it('returns null when interval is zero, negative, or non-finite', () => {
    const { result: zero } = renderHook(() =>
      useAutoRefresh({ isPaused: false, intervalMs: 0, onRefresh: jest.fn() })
    );

    expect(zero.current.secondsRemaining).toBeNull();

    const { result: neg } = renderHook(() =>
      useAutoRefresh({ isPaused: false, intervalMs: -1000, onRefresh: jest.fn() })
    );

    expect(neg.current.secondsRemaining).toBeNull();

    const { result: nan } = renderHook(() =>
      useAutoRefresh({ isPaused: false, intervalMs: Number.NaN, onRefresh: jest.fn() })
    );

    expect(nan.current.secondsRemaining).toBeNull();
  });

  it('counts down each second, calls onRefresh at zero, then resets the countdown', () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() =>
      useAutoRefresh({ isPaused: false, intervalMs: 3000, onRefresh })
    );

    expect(result.current.secondsRemaining).toBe(3);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.secondsRemaining).toBe(2);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.secondsRemaining).toBe(1);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.secondsRemaining).toBe(3);
  });

  it('stops firing `onRefresh` after pause and preserves the countdown', () => {
    const onRefresh = jest.fn();
    const { result, rerender } = renderHook(
      ({ paused }) => useAutoRefresh({ isPaused: paused, intervalMs: 2000, onRefresh }),
      { initialProps: { paused: false } }
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.secondsRemaining).toBe(1);

    rerender({ paused: true });
    expect(result.current.secondsRemaining).toBe(1);

    act(() => {
      jest.advanceTimersByTime(10_000);
    });

    expect(onRefresh).not.toHaveBeenCalled();
    expect(result.current.secondsRemaining).toBe(1);
  });

  it('resumes countdown from paused position on unpause', () => {
    const onRefresh = jest.fn();
    const { result, rerender } = renderHook(
      ({ paused }) => useAutoRefresh({ isPaused: paused, intervalMs: 5000, onRefresh }),
      { initialProps: { paused: false } }
    );

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.secondsRemaining).toBe(2);

    rerender({ paused: true });
    expect(result.current.secondsRemaining).toBe(2);

    rerender({ paused: false });
    expect(result.current.secondsRemaining).toBe(2);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.secondsRemaining).toBe(5);
  });

  it('does not leak: unmount clears the interval', () => {
    const onRefresh = jest.fn();
    const { unmount } = renderHook(() =>
      useAutoRefresh({ isPaused: false, intervalMs: 1000, onRefresh })
    );

    unmount();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('restarts the countdown when `intervalMs` changes', () => {
    const onRefresh = jest.fn();
    const { result, rerender } = renderHook(
      ({ intervalMs }: { intervalMs: number }) =>
        useAutoRefresh({ isPaused: false, intervalMs, onRefresh }),
      { initialProps: { intervalMs: 2000 } }
    );

    expect(result.current.secondsRemaining).toBe(2);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.secondsRemaining).toBe(1);

    rerender({ intervalMs: 5000 });

    expect(result.current.secondsRemaining).toBe(5);
    expect(onRefresh).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('invokes the latest onRefresh callback without resetting the timer', () => {
    const first = jest.fn();
    const second = jest.fn();
    const { rerender } = renderHook(
      ({ cb }: { cb: () => void }) =>
        useAutoRefresh({ isPaused: false, intervalMs: 1000, onRefresh: cb }),
      { initialProps: { cb: first } }
    );

    rerender({ cb: second });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it('resets the countdown when refreshEpoch increments', () => {
    const onRefresh = jest.fn();
    const { result, rerender } = renderHook(
      ({ epoch }: { epoch: number | undefined }) =>
        useAutoRefresh({ isPaused: false, intervalMs: 5000, onRefresh, refreshEpoch: epoch }),
      { initialProps: { epoch: undefined as number | undefined } }
    );

    expect(result.current.secondsRemaining).toBe(5);

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.secondsRemaining).toBe(2);

    // External refresh fires — epoch increments, countdown should reset to 5
    rerender({ epoch: 1 });

    expect(result.current.secondsRemaining).toBe(5);
    expect(onRefresh).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.secondsRemaining).toBe(5);
  });

  it('uses Math.ceil for sub-second intervals so refresh does not fire too eagerly', () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() =>
      useAutoRefresh({ isPaused: false, intervalMs: 1500, onRefresh })
    );

    expect(result.current.secondsRemaining).toBe(2);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.secondsRemaining).toBe(1);
    expect(onRefresh).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.secondsRemaining).toBe(2);
  });
});
