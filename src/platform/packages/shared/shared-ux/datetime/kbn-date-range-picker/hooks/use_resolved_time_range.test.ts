/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';

import type { TimeRangeTransformOptions } from '../types';
import { useResolvedTimeRange } from './use_resolved_time_range';

describe('useResolvedTimeRange', () => {
  const initialNow = new Date('2026-06-04T12:00:00.000Z');
  const transformOptions: TimeRangeTransformOptions = { roundRelativeTime: false };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(initialNow);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderResolvedTimeRange = (initialProps: { text: string; resolveKey: string }) =>
    renderHook(({ text, resolveKey }) => useResolvedTimeRange(text, transformOptions, resolveKey), {
      initialProps,
    });

  it('keeps the same resolution while the inputs are unchanged', () => {
    const { result, rerender } = renderHook(() =>
      useResolvedTimeRange('last 15 minutes', transformOptions, 'a')
    );
    const initial = result.current;

    jest.setSystemTime(new Date('2026-06-04T12:05:00.000Z'));
    rerender();

    expect(result.current).toBe(initial);
    expect(result.current.endDate).toEqual(initialNow);
  });

  it('re-resolves relative bounds when the resolve key changes', () => {
    const { result, rerender } = renderResolvedTimeRange({
      text: 'last 15 minutes',
      resolveKey: 'a',
    });
    expect(result.current.endDate).toEqual(initialNow);

    const laterNow = new Date('2026-06-04T12:05:00.000Z');
    jest.setSystemTime(laterNow);
    rerender({ text: 'last 15 minutes', resolveKey: 'b' });

    expect(result.current.endDate).toEqual(laterNow);
    expect(result.current.startDate).toEqual(new Date('2026-06-04T11:50:00.000Z'));
  });

  it('re-resolves when the text changes', () => {
    const { result, rerender } = renderResolvedTimeRange({
      text: 'last 15 minutes',
      resolveKey: 'a',
    });

    rerender({ text: 'last 30 minutes', resolveKey: 'a' });

    expect(result.current.startDate).toEqual(new Date('2026-06-04T11:30:00.000Z'));
  });
});
