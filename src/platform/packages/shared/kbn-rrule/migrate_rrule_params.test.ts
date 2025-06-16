/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Frequency, Weekday } from 'rrule-es';
import { migrateRRuleParams } from './migrate_rrule_params';
import type { ConstructorOptions, WeekdayStr } from './types';

describe('migrateRRuleParams', () => {
  it('camelCases all params as expected and changes byweekday to byDay', () => {
    const input: ConstructorOptions = {
      dtstart: new Date('1997-09-02T09:00:00.000-04:00'),
      tzid: 'UTC',
      byyearday: [10],
      bymonth: [1],
      bymonthday: [10],
      byweekday: [Weekday.MO],
      byhour: [10],
      byminute: [10],
      bysecond: [10],
      bysetpos: [-1],
      wkst: Weekday.MO,
      freq: Frequency.HOURLY,
      interval: 10,
      until: new Date('1997-09-02T09:00:00.000-04:00'),
      count: 10,
    };
    expect(migrateRRuleParams(input)).toMatchInlineSnapshot(`
      Object {
        "byDay": Array [
          1,
        ],
        "byHour": Array [
          10,
        ],
        "byMinute": Array [
          10,
        ],
        "byMonth": Array [
          1,
        ],
        "byMonthDay": Array [
          10,
        ],
        "bySecond": Array [
          10,
        ],
        "bySetPos": Array [
          -1,
        ],
        "byYearDay": Array [
          10,
        ],
        "count": 10,
        "dtStart": 1997-09-02T13:00:00.000Z,
        "freq": 4,
        "interval": 10,
        "tzid": "UTC",
        "until": 1997-09-02T13:00:00.000Z,
        "wkst": 1,
      }
    `);
  });

  it('converts wkst using weekday strings to numbers', () => {
    const input = {
      wkst: 'WE' as WeekdayStr,
      tzid: 'UTC',
    };
    expect(migrateRRuleParams(input).wkst).toBe(3);
  });

  it('converts byweekday using weekday strings to byDay', () => {
    const input = {
      byweekday: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'],
      tzid: 'UTC',
    };
    expect(migrateRRuleParams(input).byDay).toMatchInlineSnapshot(`
      Array [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
      ]
    `);
  });

  it('converts byweekday using pos strings to byDay using pos syntax', () => {
    const input = {
      byweekday: ['+1MO', '+2TU', '-2WE', '+2TH', '-2FR', '+3SA', '-3SU'],
      tzid: 'UTC',
    };
    expect(migrateRRuleParams(input).byDay).toMatchInlineSnapshot(`
      Array [
        Array [
          1,
          1,
        ],
        Array [
          2,
          2,
        ],
        Array [
          -2,
          3,
        ],
        Array [
          2,
          4,
        ],
        Array [
          -2,
          5,
        ],
        Array [
          3,
          6,
        ],
        Array [
          -3,
          7,
        ],
      ]
    `);
  });
});
