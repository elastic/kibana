/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from './debounced_value';

describe('useDebouncedValue', () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('should update upstream value changes', () => {
    const onChangeMock = vi.fn();
    const { result } = renderHook(() => useDebouncedValue({ value: 'a', onChange: onChangeMock }));

    act(() => {
      result.current.handleInputChange('b');
    });
    expect(onChangeMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(256);

    expect(onChangeMock).toHaveBeenCalledWith('b');
  });

  it('should fallback to initial value with empty string (by default)', () => {
    const onChangeMock = vi.fn();
    const { result } = renderHook(() => useDebouncedValue({ value: 'a', onChange: onChangeMock }));

    act(() => {
      result.current.handleInputChange('');
    });
    expect(onChangeMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(256);
    expect(onChangeMock).toHaveBeenCalledWith('a');
  });

  it('should allow empty input to be updated', () => {
    const onChangeMock = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedValue({ value: 'a', onChange: onChangeMock }, { allowFalsyValue: true })
    );

    act(() => {
      result.current.handleInputChange('');
    });
    expect(onChangeMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(256);
    expect(onChangeMock).toHaveBeenCalledWith('');
  });
  it('custom wait time is respected', () => {
    const onChangeMock = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedValue({ value: 'a', onChange: onChangeMock }, { wait: 500 })
    );

    act(() => {
      result.current.handleInputChange('b');
    });
    expect(onChangeMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(256);
    expect(onChangeMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(244); // sums to 500
    expect(onChangeMock).toHaveBeenCalledWith('b');
  });
});
