/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { BehaviorSubject, Subject } from 'rxjs';
import { useObservable } from './use_observable';

describe('useObservable', () => {
  it('reads BehaviorSubject value synchronously', () => {
    const subject$ = new BehaviorSubject(42);
    const { result } = renderHook(() => useObservable(subject$));
    expect(result.current).toBe(42);
  });

  it('updates on emission', async () => {
    const subject$ = new BehaviorSubject(1);
    const { result } = renderHook(() => useObservable(subject$));

    await act(() => {
      subject$.next(2);
    });
    expect(result.current).toBe(2);
  });

  it('unsubscribes on unmount', () => {
    const subject$ = new BehaviorSubject(1);
    const { unmount } = renderHook(() => useObservable(subject$));

    expect(subject$.observers.length).toBe(1);
    unmount();
    expect(subject$.observers.length).toBe(0);
  });

  it('resubscribes when observable changes', () => {
    const subject1$ = new BehaviorSubject(1);
    const subject2$ = new BehaviorSubject(2);

    const { result, rerender } = renderHook(({ obs }) => useObservable(obs), {
      initialProps: { obs: subject1$ },
    });

    expect(result.current).toBe(1);

    rerender({ obs: subject2$ });

    expect(result.current).toBe(2);
    expect(subject1$.observers.length).toBe(0);
  });

  it('uses initial value for Subject', async () => {
    const subject$ = new Subject<number>();
    const { result } = renderHook(() => useObservable(subject$, 99));

    expect(result.current).toBe(99);

    await act(() => {
      subject$.next(42);
    });
    expect(result.current).toBe(42);
  });

  it('returns undefined without initial value', async () => {
    const subject$ = new Subject<number>();
    const { result } = renderHook(() => useObservable(subject$));

    expect(result.current).toBeUndefined();

    await act(() => {
      subject$.next(42);
    });
    expect(result.current).toBe(42);
  });

  it('handles null and undefined values', async () => {
    const subject$ = new BehaviorSubject<number | null>(null);
    const { result } = renderHook(() => useObservable(subject$));

    expect(result.current).toBeNull();

    await act(() => {
      subject$.next(42);
    });
    expect(result.current).toBe(42);

    await act(() => {
      subject$.next(null);
    });
    expect(result.current).toBeNull();
  });

  it('warns when observable recreated every render', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const { rerender } = renderHook(() => useObservable(new BehaviorSubject(1)));

    expect(consoleWarnSpy).not.toHaveBeenCalledWith(expect.stringContaining('Performance Warning'));
    rerender();
    expect(consoleWarnSpy).not.toHaveBeenCalledWith(expect.stringContaining('Performance Warning'));
    rerender();

    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Performance Warning'));

    consoleWarnSpy.mockRestore();
  });
});
