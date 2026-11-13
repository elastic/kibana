/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getInterval, getTicks } from './time_utils';

describe('getInterval', () => {
  const hour = 36e5;
  const day = 864e5;
  const from = Date.UTC(2024, 5, 9);

  it('picks 3h for a 1 day range with 20 steps', () => {
    expect(getInterval(from, from + day, 'UTC')).toBe(3 * hour);
  });

  it('picks 5m for a 1 hour range with 20 steps', () => {
    expect(getInterval(from, from + hour, 'UTC')).toBe(5 * 6e4);
  });

  it('picks 1M for a 1 year range with 20 steps', () => {
    expect(getInterval(Date.UTC(2024, 0, 1), Date.UTC(2025, 0, 1), 'UTC')).toBe(30 * day);
  });

  it('honors a smaller steps cap than the default 20', () => {
    expect(getInterval(from, from + hour, 'UTC', 5)).toBe(30 * 6e4);
  });

  it('treats an invalid timezone as UTC', () => {
    expect(getInterval(from, from + day, 'Not/AZone')).toBe(getInterval(from, from + day, 'UTC'));
  });

  it('widens 1y when the range is longer than 20 years', () => {
    const min = Date.UTC(2000, 0, 1);
    const max = Date.UTC(2050, 0, 1);
    const interval = getInterval(min, max, 'UTC');
    expect((max - min) / interval).toBeLessThanOrEqual(20);
  });
});

describe('getTicks', () => {
  const hour = 36e5;
  const from = Date.UTC(2024, 5, 9);

  it('never exceeds 20 ticks', () => {
    const ranges: Array<[number, number]> = [
      [from, from + hour],
      [from, from + 864e5],
      [Date.UTC(2024, 0, 1), Date.UTC(2025, 0, 1)],
      [Date.UTC(2000, 0, 1), Date.UTC(2050, 0, 1)],
    ];
    for (const [min, max] of ranges) {
      expect(getTicks(min, max, 'UTC').length).toBeLessThanOrEqual(20);
    }
  });
});
