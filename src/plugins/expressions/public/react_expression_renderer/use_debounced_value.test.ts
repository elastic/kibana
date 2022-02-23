/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { useDebouncedValue } from './use_debounced_value';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    jest.useFakeTimers('modern');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return the initial value', () => {
    const { result } = renderHook(() => useDebouncedValue('something', 1000));

    const [value] = result.current;
    expect(value).toBe('something');
  });

  it('should debounce value update', () => {
    const hook = renderHook((value) => useDebouncedValue(value, 1000), {
      initialProps: 'something',
    });
    hook.rerender('something else');

    const [value, isPending] = hook.result.current;
    expect(value).toBe('something');
    expect(isPending).toBe(true);
  });

  it('should update value after a timeout', () => {
    const hook = renderHook((value) => useDebouncedValue(value, 1000), {
      initialProps: 'something',
    });

    hook.rerender('something else');
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    const [value, isPending] = hook.result.current;
    expect(value).toBe('something else');
    expect(isPending).toBe(false);
  });

  it('should throttle multiple value updates', () => {
    const hook = renderHook((value) => useDebouncedValue(value, 1000), {
      initialProps: 'something',
    });

    hook.rerender('something else');
    act(() => {
      jest.advanceTimersByTime(500);
    });

    hook.rerender('another value');
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    const [value] = hook.result.current;
    expect(value).toBe('another value');
  });

  it('should update value immediately if there is no timeout', () => {
    const hook = renderHook((value) => useDebouncedValue(value), { initialProps: 'something' });

    hook.rerender('something else');

    const [value, isPending] = hook.result.current;
    expect(value).toBe('something else');
    expect(isPending).toBe(false);
  });
});
