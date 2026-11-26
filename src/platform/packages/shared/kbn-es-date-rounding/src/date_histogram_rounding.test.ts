/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toDateRounding, toDslDateRounding } from '..';

describe('toDslDateRounding', () => {
  it.each([
    ['1m', { kind: 'fixed', widthMs: 60_000 }],
    ['hour', { kind: 'fixed', widthMs: 3_600_000 }],
    ['1d', { kind: 'calendar', unit: 'day', amount: 1 }],
    ['week', { kind: 'calendar', unit: 'isoWeek', amount: 1 }],
    ['1M', { kind: 'calendar', unit: 'month', amount: 1 }],
    ['1q', { kind: 'calendar', unit: 'month', amount: 3 }],
    ['year', { kind: 'calendar', unit: 'year', amount: 1 }],
  ])('maps calendar_interval %s', (calendarInterval, expected) => {
    expect(toDslDateRounding({ calendar_interval: calendarInterval })).toEqual(expected);
  });

  it.each([
    ['100ms', 100],
    ['30s', 30_000],
    ['45m', 2_700_000],
    ['12h', 43_200_000],
    ['1d', 86_400_000],
    ['2d', 172_800_000],
  ])('maps fixed_interval %s to a fixed width', (fixedInterval, widthMs) => {
    expect(toDslDateRounding({ fixed_interval: fixedInterval })).toEqual({
      kind: 'fixed',
      widthMs,
    });
  });

  it('reads 1d by parameter, unlike the ES|QL parser', () => {
    expect(toDslDateRounding({ fixed_interval: '1d' })).toEqual({
      kind: 'fixed',
      widthMs: 86_400_000,
    });
    expect(toDateRounding('1d')).toEqual({ kind: 'calendar', unit: 'day', amount: 1 });
  });

  it.each([{ calendar_interval: '3M' }, { calendar_interval: '2d' }, { calendar_interval: '' }])(
    'rejects %p',
    (interval) => {
      expect(toDslDateRounding(interval)).toBeUndefined();
    }
  );

  it.each([{ fixed_interval: '1w' }, { fixed_interval: '1M' }, { fixed_interval: '0h' }])(
    'rejects %p',
    (interval) => {
      expect(toDslDateRounding(interval)).toBeUndefined();
    }
  );
});
