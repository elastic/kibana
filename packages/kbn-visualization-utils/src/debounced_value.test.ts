/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { useDebouncedValue } from './debounced_value';

describe('useDebouncedValue', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should update upstream value changes', () => {
    const onChangeMock = jest.fn();
    const { result } = renderHook(() => useDebouncedValue({ value: 'a', onChange: onChangeMock }));

    act(() => {
      result.current.handleInputChange('b');
    });
    expect(onChangeMock).not.toHaveBeenCalled();
    jest.advanceTimersByTime(256);

    expect(onChangeMock).toHaveBeenCalledWith('b');
  });

  it('should fallback to initial value with empty string (by default)', () => {
    const onChangeMock = jest.fn();
    const { result } = renderHook(() => useDebouncedValue({ value: 'a', onChange: onChangeMock }));

    act(() => {
      result.current.handleInputChange('');
    });
    expect(onChangeMock).not.toHaveBeenCalled();
    jest.advanceTimersByTime(256);
    expect(onChangeMock).toHaveBeenCalledWith('a');
  });

  it('should allow empty input to be updated', () => {
    const onChangeMock = jest.fn();
    const { result } = renderHook(() =>
      useDebouncedValue({ value: 'a', onChange: onChangeMock }, { allowFalsyValue: true })
    );

    act(() => {
      result.current.handleInputChange('');
    });
    expect(onChangeMock).not.toHaveBeenCalled();
    jest.advanceTimersByTime(256);
    expect(onChangeMock).toHaveBeenCalledWith('');
  });
  it('custom wait time is respected', () => {
    const onChangeMock = jest.fn();
    const { result } = renderHook(() =>
      useDebouncedValue({ value: 'a', onChange: onChangeMock }, { wait: 500 })
    );

    act(() => {
      result.current.handleInputChange('b');
    });
    expect(onChangeMock).not.toHaveBeenCalled();
    jest.advanceTimersByTime(256);
    expect(onChangeMock).not.toHaveBeenCalled();
    jest.advanceTimersByTime(244); // sums to 500
    expect(onChangeMock).toHaveBeenCalledWith('b');
  });
});
