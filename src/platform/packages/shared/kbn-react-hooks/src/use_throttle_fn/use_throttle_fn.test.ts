/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { useThrottleFn } from '../..';

describe('useThrottleFn hook', () => {
  jest.useFakeTimers();

  it('should throttle the function call', () => {
    const fn = jest.fn();
    const { result } = renderHook(() => useThrottleFn(fn, { wait: 200, leading: false }));

    act(() => {
      result.current.run();
      result.current.run();
      result.current.run();
    });

    // Because leading is false, the fn won't be called immediately.
    expect(fn).toBeCalledTimes(0);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(fn).toBeCalledTimes(1);

    act(() => {
      result.current.run();
      jest.advanceTimersByTime(200);
    });

    expect(fn).toBeCalledTimes(2);
  });

  it('should cancel the throttled function call', () => {
    const fn = jest.fn();
    const { result } = renderHook(() => useThrottleFn(fn, { wait: 200, leading: false }));

    act(() => {
      result.current.run();
      result.current.cancel();
    });

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(fn).not.toBeCalled();
  });

  it('should flush the throttled function call', () => {
    const fn = jest.fn();
    const { result } = renderHook(() => useThrottleFn(fn, { wait: 200 }));

    act(() => {
      result.current.run();
      result.current.flush();
    });

    expect(fn).toBeCalledTimes(1);
  });

  it('should handle leading option correctly', () => {
    const fn = jest.fn();
    const { result } = renderHook(() => useThrottleFn(fn, { wait: 200, leading: true }));

    act(() => {
      result.current.run();
    });

    expect(fn).toBeCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    act(() => {
      result.current.run();
    });

    expect(fn).toBeCalledTimes(2);
  });

  it('should handle trailing option correctly', () => {
    const fn = jest.fn();
    const { result } = renderHook(() => useThrottleFn(fn, { wait: 200, trailing: true }));

    act(() => {
      result.current.run();
      result.current.run();
    });

    expect(fn).toBeCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(fn).toBeCalledTimes(2);
  });
});
