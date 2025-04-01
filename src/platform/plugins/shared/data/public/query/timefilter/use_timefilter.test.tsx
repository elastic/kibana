/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import { Subject } from 'rxjs';
import { createUseTimefilterHook } from './use_timefilter';
import { TimeRange } from '@kbn/es-query';

describe('useTimefilter hook', () => {
  const timeUpdateSubject = new Subject<void>();

  const initialTimeRange: TimeRange = {
    from: 'now-1d',
    to: 'now',
  };

  const initialAbsoluteTimeRange = {
    from: '2020-01-01T00:00:00Z',
    to: '2020-01-02T00:00:00Z',
  };

  // Track the current time range in the mock
  let currentTimeRange = { ...initialTimeRange };

  const mockTimefilter = {
    getTime: jest.fn().mockImplementation(() => currentTimeRange),
    getAbsoluteTime: jest.fn().mockReturnValue(initialAbsoluteTimeRange),
    setTime: jest.fn().mockImplementation((timeRange) => {
      currentTimeRange = timeRange;
    }),
    getTimeUpdate$: jest.fn().mockReturnValue(timeUpdateSubject),
  };

  const useTimefilter = createUseTimefilterHook(mockTimefilter as any);

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the current time range for each test
    currentTimeRange = { ...initialTimeRange };
  });

  test('time range and absolute time range should have the right values', () => {
    const { result } = renderHook(() => useTimefilter());

    expect(result.current.timeRange).toEqual(initialTimeRange);
    expect(result.current.absoluteTimeRange).toEqual({
      start: new Date(initialAbsoluteTimeRange.from).getTime(),
      end: new Date(initialAbsoluteTimeRange.to).getTime(),
    });
  });

  test('hook should rerender when the time update gets updated', () => {
    const { result } = renderHook(() => useTimefilter());

    const updatedTimeRange = {
      from: '2021-01-01T00:00:00Z',
      to: '2021-01-02T00:00:00Z',
    };

    const updatedAbsoluteTimeRange = {
      from: '2021-01-01T00:00:00Z',
      to: '2021-01-02T00:00:00Z',
    };

    // Update the current time range for the mock
    currentTimeRange = updatedTimeRange;
    mockTimefilter.getAbsoluteTime.mockReturnValue(updatedAbsoluteTimeRange);

    act(() => {
      timeUpdateSubject.next();
    });

    expect(result.current.timeRange).toEqual(updatedTimeRange);
    expect(result.current.absoluteTimeRange).toEqual({
      start: new Date(updatedAbsoluteTimeRange.from).getTime(),
      end: new Date(updatedAbsoluteTimeRange.to).getTime(),
    });
  });

  test('setTimeRange should call through correctly', () => {
    const { result } = renderHook(() => useTimefilter());

    const newTimeRange = {
      from: '2022-01-01T00:00:00Z',
      to: '2022-01-02T00:00:00Z',
    };

    act(() => {
      result.current.setTimeRange(newTimeRange);
    });

    expect(mockTimefilter.setTime).toHaveBeenCalledWith(newTimeRange);

    // Test with callback form
    act(() => {
      result.current.setTimeRange((prevRange) => ({
        ...prevRange,
        from: '2022-02-01T00:00:00Z',
      }));
    });

    expect(mockTimefilter.setTime).toHaveBeenCalledWith({
      ...newTimeRange,
      from: '2022-02-01T00:00:00Z',
    });
  });
});
