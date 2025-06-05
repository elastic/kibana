/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Params, Weekday } from 'rrule-es';
import type { ConstructorOptions, WeekdayStr } from './types';

// Migrate RRULEs using the old python-dateutils schema to the new rrule-es schema
export function migrateRRuleParams(
  oldParams: Omit<ConstructorOptions, 'dtstart'>
): Omit<Params, 'dtStart'>;
export function migrateRRuleParams(oldParams: Partial<ConstructorOptions>): Partial<Params> {
  return {
    dtStart: oldParams.dtstart,
    tzid: oldParams.tzid,
    freq: oldParams.freq,
    interval: oldParams.interval,
    until: oldParams.until,
    count: oldParams.count,
    byYearDay: oldParams.byyearday,
    byMonth: oldParams.bymonth,
    byMonthDay: oldParams.bymonthday,
    byDay: oldParams.byweekday?.map((d) => {
      if (typeof d !== 'string') return d;
      if (Object.keys(Weekday).includes(d)) return Weekday[d as WeekdayStr];
      const [sign, number, ...rest] = d.split('');
      const dayOfWeek = Weekday[rest.join('') as WeekdayStr];
      if (sign === '-') return [-Number(number), dayOfWeek];
      else return [Number(number), dayOfWeek];
    }),
    byHour: oldParams.byhour,
    byMinute: oldParams.byminute,
    bySecond: oldParams.bysecond,
    bySetPos: oldParams.bysetpos,
    wkst:
      typeof oldParams.wkst === 'string' ? Weekday[oldParams.wkst as WeekdayStr] : oldParams.wkst,
  };
}
