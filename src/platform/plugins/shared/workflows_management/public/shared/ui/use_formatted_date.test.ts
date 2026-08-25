/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import {
  useFormattedDate,
  useFormattedDateTime,
  useGetFormattedDateTime,
} from './use_formatted_date';
import { createUseKibanaMockValue } from '../../mocks';

jest.mock('../../hooks/use_kibana');

const mockKibanaValue = createUseKibanaMockValue();
const mockGet = mockKibanaValue.services.settings.client.get as jest.Mock;

describe('useFormattedDate', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reconfigure after clearAllMocks resets mockGet
    const { useKibana } = jest.requireMock('../../hooks/use_kibana') as {
      useKibana: jest.Mock;
    };
    useKibana.mockReturnValue(mockKibanaValue);

    mockGet.mockImplementation((key: string) => {
      if (key === 'dateFormat') return 'YYYY-MM-DD HH:mm:ss';
      if (key === 'dateFormat:tz') return 'UTC';
      return undefined;
    });
  });

  it('should return undefined when timestamp is undefined', () => {
    const { result } = renderHook(() => useFormattedDate(undefined));
    expect(result.current).toBeUndefined();
  });

  it('should format a valid date string', () => {
    const { result } = renderHook(() => useFormattedDate('2024-01-15T12:00:00Z'));
    expect(result.current).toBe('2024-01-15 12:00:00');
  });

  it('should format a valid Date object', () => {
    const date = new Date('2024-06-20T08:30:00Z');
    const { result } = renderHook(() => useFormattedDate(date));
    expect(result.current).toBe('2024-06-20 08:30:00');
  });

  it('should format a numeric timestamp', () => {
    // 2024-01-01T00:00:00Z
    const { result } = renderHook(() => useFormattedDate(1704067200000));
    expect(result.current).toBe('2024-01-01 00:00:00');
  });

  it('should return "Invalid Date" for an invalid date', () => {
    const { result } = renderHook(() => useFormattedDate('not-a-date'));
    expect(result.current).toBe('Invalid Date');
  });

  it('should use Intl formatter when dateFormat setting is empty', () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'dateFormat') return '';
      if (key === 'dateFormat:tz') return 'UTC';
      return undefined;
    });

    const { result } = renderHook(() => useFormattedDate('2024-01-15T12:00:00Z'));
    // Intl formatter returns locale-specific format; just verify it returns a string
    expect(typeof result.current).toBe('string');
    expect(result.current).not.toBe('Invalid Date');
  });
});

describe('useFormattedDateTime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockImplementation((key: string) => {
      if (key === 'dateFormat') return 'YYYY-MM-DD HH:mm:ss';
      if (key === 'dateFormat:tz') return 'UTC';
      return undefined;
    });
  });

  it('should format a valid Date object', () => {
    const date = new Date('2024-03-10T14:30:00Z');
    const { result } = renderHook(() => useFormattedDateTime(date));
    expect(result.current).toBe('2024-03-10 14:30:00');
  });

  it('should return "Invalid Date" for an invalid date', () => {
    const date = new Date('invalid');
    const { result } = renderHook(() => useFormattedDateTime(date));
    expect(result.current).toBe('Invalid Date');
  });
});

describe('useGetFormattedDateTime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockImplementation((key: string) => {
      if (key === 'dateFormat') return 'YYYY-MM-DD HH:mm:ss';
      if (key === 'dateFormat:tz') return 'UTC';
      return undefined;
    });
  });

  it('should return a formatter function', () => {
    const { result } = renderHook(() => useGetFormattedDateTime());
    expect(typeof result.current).toBe('function');
  });

  it('should format a valid date when the returned function is called', () => {
    const { result } = renderHook(() => useGetFormattedDateTime());
    const formatted = result.current(new Date('2024-05-01T10:00:00Z'));
    expect(formatted).toBe('2024-05-01 10:00:00');
  });

  it('should return "Invalid Date" for an invalid date', () => {
    const { result } = renderHook(() => useGetFormattedDateTime());
    const formatted = result.current(new Date('invalid'));
    expect(formatted).toBe('Invalid Date');
  });

  it('should handle Browser timezone setting by guessing', () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'dateFormat') return 'YYYY-MM-DD';
      if (key === 'dateFormat:tz') return 'Browser';
      return undefined;
    });

    const { result } = renderHook(() => useGetFormattedDateTime());
    const formatted = result.current(new Date('2024-01-15T00:00:00Z'));
    // The browser timezone will vary, but it should produce a valid formatted string
    expect(typeof formatted).toBe('string');
    expect(formatted).not.toBe('Invalid Date');
  });
});
