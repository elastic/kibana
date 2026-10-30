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

  it('keeps the previous object when the range only drifted by seconds', () => {
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

  it('returns nothing without a resolvable range', () => {
    const { result } = renderHook(useStableTraceSource, {
      initialProps: { ...input, timeFrom: undefined },
    });
    expect(result.current).toBeUndefined();
  });
});
