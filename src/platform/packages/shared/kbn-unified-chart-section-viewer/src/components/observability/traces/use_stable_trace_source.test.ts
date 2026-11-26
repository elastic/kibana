/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useStableTraceSource } from './use_stable_trace_source';

const input = {
  indexPattern: 'traces-apm*',
  filters: ['service.name == "cart"'],
  timeFrom: '2026-10-26T10:00:00.000Z',
  timeTo: '2026-10-26T11:00:00.000Z',
  // As the time picker holds it: relative, so every fetch resolves it anew.
  relativeTimeRange: { from: 'now-1h', to: 'now' },
};

describe('useStableTraceSource', () => {
  it('resolves the range to absolute ISO timestamps', () => {
    const { result } = renderHook(useStableTraceSource, { initialProps: input });
    expect(result.current).toEqual({
      indexPattern: 'traces-apm*',
      filters: ['service.name == "cart"'],
      timeRange: { from: '2026-10-26T10:00:00.000Z', to: '2026-10-26T11:00:00.000Z' },
    });
  });

  it('keeps the previous object when a relative range only drifted by seconds', () => {
    const { result, rerender } = renderHook(useStableTraceSource, { initialProps: input });
    const first = result.current;
    rerender({
      ...input,
      filters: ['service.name == "cart"'],
      timeFrom: '2026-10-26T10:00:30.000Z',
      timeTo: '2026-10-26T11:00:30.000Z',
    });
    expect(result.current).toBe(first);
  });

  it('follows an absolute range moved by seconds: only the user moves such a range', () => {
    const absolute = {
      ...input,
      relativeTimeRange: { from: input.timeFrom, to: input.timeTo },
    };
    const { result, rerender } = renderHook(useStableTraceSource, { initialProps: absolute });
    const first = result.current;
    rerender({ ...absolute, timeTo: '2026-10-26T11:00:30.000Z' });
    expect(result.current).not.toBe(first);
    expect(result.current?.timeRange.to).toBe('2026-10-26T11:00:30.000Z');
    // Rendered again with the same inputs: still the same source.
    const second = result.current;
    rerender({ ...absolute, timeTo: '2026-10-26T11:00:30.000Z' });
    expect(result.current).toBe(second);
  });

  it('treats a changed context key as a new source, and carries it', () => {
    const { result, rerender } = renderHook(useStableTraceSource, {
      initialProps: { ...input, contextKey: 'a' },
    });
    const first = result.current;
    expect(first?.contextKey).toBe('a');
    rerender({ ...input, contextKey: 'a' });
    expect(result.current).toBe(first);
    rerender({ ...input, contextKey: 'b' });
    expect(result.current).not.toBe(first);
    expect(result.current?.contextKey).toBe('b');
  });

  it('returns a new source when the filters change', () => {
    const { result, rerender } = renderHook(useStableTraceSource, { initialProps: input });
    const first = result.current;
    rerender({ ...input, filters: ['service.name == "checkout"'] });
    expect(result.current).not.toBe(first);
    expect(result.current?.filters).toEqual(['service.name == "checkout"']);
  });

  it('returns a new source when the range really moved', () => {
    const { result, rerender } = renderHook(useStableTraceSource, { initialProps: input });
    const first = result.current;
    rerender({ ...input, timeFrom: '2026-10-26T08:00:00.000Z' });
    expect(result.current).not.toBe(first);
  });

  it('follows a small edit of a long range rather than scaling the tolerance with it', () => {
    const longRange = {
      ...input,
      timeFrom: '2026-08-01T00:00:00.000Z',
      timeTo: '2026-10-29T00:00:00.000Z',
    };
    const { result, rerender } = renderHook(useStableTraceSource, { initialProps: longRange });
    const first = result.current;
    // 2% of ~90 days would swallow this 12h edit; the absolute cap must not.
    rerender({ ...longRange, timeFrom: '2026-08-01T12:00:00.000Z' });
    expect(result.current).not.toBe(first);
    expect(result.current?.timeRange.from).toBe('2026-08-01T12:00:00.000Z');
  });

  it('returns nothing without a resolvable range', () => {
    const { result } = renderHook(useStableTraceSource, {
      initialProps: { ...input, timeFrom: undefined },
    });
    expect(result.current).toBeUndefined();
  });
});
