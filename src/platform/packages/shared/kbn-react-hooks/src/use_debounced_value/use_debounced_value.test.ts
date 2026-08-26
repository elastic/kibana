/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from '../..';

describe('useDebouncedValue hook', () => {
  jest.useFakeTimers();

  it('should return the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('hello', 200));

    expect(result.current).toBe('hello');
  });

  it('should not update the value before the wait period', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 200), {
      initialProps: { value: 'hello' },
    });

    rerender({ value: 'world' });

    expect(result.current).toBe('hello');
  });

  it('should update the value after the wait period', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 200), {
      initialProps: { value: 'hello' },
    });

    rerender({ value: 'world' });

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe('world');
  });

  it('should only emit the latest value when changed rapidly', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 200), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'b' });
    rerender({ value: 'c' });
    rerender({ value: 'd' });

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe('d');
  });

  it('should use default wait when not provided', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: 'hello' },
    });

    rerender({ value: 'world' });

    act(() => {
      jest.advanceTimersByTime(299);
    });

    expect(result.current).toBe('hello');

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(result.current).toBe('world');
  });

  it('should work with non-string values', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 100), {
      initialProps: { value: 42 },
    });

    rerender({ value: 99 });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current).toBe(99);
  });

  describe('compare option', () => {
    it('should skip the debounce when compare returns true', () => {
      const compare = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
      const { result, rerender } = renderHook(
        ({ value }) => useDebouncedValue(value, 200, { compare }),
        { initialProps: { value: 'Hello' } }
      );

      rerender({ value: 'HELLO' });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(result.current).toBe('Hello');
    });

    it('should debounce when compare returns false', () => {
      const compare = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
      const { result, rerender } = renderHook(
        ({ value }) => useDebouncedValue(value, 200, { compare }),
        { initialProps: { value: 'Hello' } }
      );

      rerender({ value: 'World' });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(result.current).toBe('World');
    });

    it('should use custom compare for object values', () => {
      const compare = (a: { id: number }, b: { id: number }) => a.id === b.id;
      const { result, rerender } = renderHook(
        ({ value }) => useDebouncedValue(value, 200, { compare }),
        { initialProps: { value: { id: 1 } } }
      );

      rerender({ value: { id: 1 } });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(result.current).toEqual({ id: 1 });

      rerender({ value: { id: 2 } });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(result.current).toEqual({ id: 2 });
    });
  });
});
