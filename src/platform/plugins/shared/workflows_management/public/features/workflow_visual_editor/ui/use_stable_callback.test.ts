/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useStableCallback } from './use_stable_callback';

describe('useStableCallback', () => {
  it('returns the same function on every render', () => {
    const { result, rerender } = renderHook(({ callback }) => useStableCallback(callback), {
      initialProps: { callback: (n: number) => n },
    });
    const first = result.current;
    rerender({ callback: (n: number) => n * 2 });
    expect(result.current).toBe(first);
  });

  it('calls the latest callback with the arguments given', () => {
    const { result, rerender } = renderHook(({ callback }) => useStableCallback(callback), {
      initialProps: { callback: (a: number, b: number) => a + b },
    });
    expect(result.current(1, 2)).toBe(3);
    rerender({ callback: (a: number, b: number) => a * b });
    expect(result.current(3, 4)).toBe(12);
  });

  it('returns what the callback returns', () => {
    const { result } = renderHook(() => useStableCallback(() => 'done'));
    expect(result.current()).toBe('done');
  });

  it('reads state the latest render closed over', () => {
    const seen: string[] = [];
    const { result, rerender } = renderHook(
      ({ label }) => useStableCallback(() => seen.push(label)),
      { initialProps: { label: 'a' } }
    );
    rerender({ label: 'b' });
    result.current();
    expect(seen).toEqual(['b']);
  });
});
