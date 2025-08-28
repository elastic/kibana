/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { calculateQueryRangeSeconds } from './time_range_utils';

describe('calculateQueryRangeSeconds', () => {
  it('should calculate correct seconds for a 1-hour range', () => {
    const timeRange = {
      from: '2023-01-01T00:00:00.000Z',
      to: '2023-01-01T01:00:00.000Z',
    };
    expect(calculateQueryRangeSeconds(timeRange)).toBe(3600);
  });

  it('should calculate correct seconds for a 24-hour range', () => {
    const timeRange = {
      from: '2023-01-01T00:00:00.000Z',
      to: '2023-01-02T00:00:00.000Z',
    };
    expect(calculateQueryRangeSeconds(timeRange)).toBe(86400);
  });

  it('should handle sub-second differences correctly', () => {
    const timeRange = {
      from: '2023-01-01T00:00:00.000Z',
      to: '2023-01-01T00:00:00.500Z',
    };
    expect(calculateQueryRangeSeconds(timeRange)).toBe(1); // Rounded up
  });

  it('should handle same from and to times', () => {
    const timeRange = {
      from: '2023-01-01T00:00:00.000Z',
      to: '2023-01-01T00:00:00.000Z',
    };
    expect(calculateQueryRangeSeconds(timeRange)).toBe(0);
  });

  it('should calculate correct seconds for a 7-day range', () => {
    const timeRange = {
      from: '2023-01-01T00:00:00.000Z',
      to: '2023-01-08T00:00:00.000Z',
    };
    expect(calculateQueryRangeSeconds(timeRange)).toBe(604800); // 7 * 24 * 60 * 60
  });

  it('should calculate correct seconds for a 15-minute range', () => {
    const timeRange = {
      from: '2023-01-01T00:00:00.000Z',
      to: '2023-01-01T00:15:00.000Z',
    };
    expect(calculateQueryRangeSeconds(timeRange)).toBe(900); // 15 * 60
  });

  it('should handle invalid date strings gracefully', () => {
    const timeRange = {
      from: 'invalid-date',
      to: '2023-01-01T00:15:00.000Z',
    };
    expect(calculateQueryRangeSeconds(timeRange)).toBeNaN();
  });
});
