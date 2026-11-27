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
  const laterNow = new Date('2026-06-04T12:05:00.000Z');
  const transformOptions: TimeRangeTransformOptions = { roundRelativeTime: false };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(initialNow);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  interface HookProps {
    text: string;
    resolveKey: string;
    options?: TimeRangeTransformOptions;
  }

  const renderResolvedTimeRange = (initialProps: HookProps) =>
    renderHook(
      ({ text, resolveKey, options = transformOptions }: HookProps) =>
        useResolvedTimeRange(text, options, resolveKey),
      { initialProps }
    );

  it('keeps the same resolution while the inputs are unchanged', () => {
    const { result, rerender } = renderResolvedTimeRange({
      text: 'last 15 minutes',
      resolveKey: 'a',
    });
    const initial = result.current;

    jest.setSystemTime(laterNow);
    rerender({ text: 'last 15 minutes', resolveKey: 'a' });

    expect(result.current).toBe(initial);
    expect(result.current.endDate).toEqual(initialNow);
  });

  it('re-resolves relative bounds when the resolve key changes and keeps the new resolution', () => {
    const { result, rerender } = renderResolvedTimeRange({
      text: 'last 15 minutes',
      resolveKey: 'a',
    });
    expect(result.current.endDate).toEqual(initialNow);

    jest.setSystemTime(laterNow);
    rerender({ text: 'last 15 minutes', resolveKey: 'b' });

    expect(result.current.endDate).toEqual(laterNow);
    expect(result.current.startDate).toEqual(new Date('2026-06-04T11:50:00.000Z'));

    // The resolution is stored: a later render with the same key does not hit the clock again.
    const resolved = result.current;
    jest.setSystemTime(new Date('2026-06-04T12:10:00.000Z'));
    rerender({ text: 'last 15 minutes', resolveKey: 'b' });

    expect(result.current).toBe(resolved);
    expect(result.current.endDate).toEqual(laterNow);
  });

  it('re-resolves against the current time when the text changes', () => {
    const { result, rerender } = renderResolvedTimeRange({
      text: 'last 15 minutes',
      resolveKey: 'a',
    });
    expect(result.current.endDate).toEqual(initialNow);

    jest.setSystemTime(laterNow);
    rerender({ text: 'last 30 minutes', resolveKey: 'a' });

    expect(result.current.endDate).toEqual(laterNow);
    expect(result.current.startDate).toEqual(new Date('2026-06-04T11:35:00.000Z'));
  });

  it('re-resolves when the transform options change', () => {
    const { result, rerender } = renderResolvedTimeRange({
      text: 'last 15 minutes',
      resolveKey: 'a',
    });
    expect(result.current.start).toBe('now-15m');

    jest.setSystemTime(laterNow);
    rerender({ text: 'last 15 minutes', resolveKey: 'a', options: { roundRelativeTime: true } });

    expect(result.current.start).toBe('now-15m/s');
    expect(result.current.endDate).toEqual(laterNow);
  });
});
