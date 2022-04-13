/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dateMath, { Unit } from '@kbn/datemath';
import { InvalidEsCalendarIntervalError } from './invalid_es_calendar_interval_error';
import { InvalidEsIntervalFormatError } from './invalid_es_interval_format_error';

const ES_INTERVAL_STRING_REGEX = new RegExp(
  '^([1-9][0-9]*)\\s*(' + dateMath.units.join('|') + ')$'
);
export type ParsedInterval = ReturnType<typeof parseEsInterval>;

/** ES allows to work at user-friendly intervals.
 *  This method matches between these intervals and the intervals accepted by parseEsInterval.
 *  @internal **/
const mapToEquivalentInterval = (interval: string) => {
  switch (interval) {
    case 'minute':
      return '1m';
    case 'hour':
      return '1h';
    case 'day':
      return '1d';
    case 'week':
      return '1w';
    case 'month':
      return '1M';
    case 'quarter':
      return '1q';
    case 'year':
      return '1y';
  }
  return interval;
};

/**
 * Extracts interval properties from an ES interval string. Disallows unrecognized interval formats
 * and fractional values. Converts some intervals from "calendar" to "fixed" when the number of
 * units is larger than 1, and throws an error for others.
 *
 * Conversion rules:
 *
 * | Interval | Single unit type | Multiple units type |
 * | -------- | ---------------- | ------------------- |
 * | ms       | fixed            | fixed               |
 * | s        | fixed            | fixed               |
 * | m        | calendar         | fixed               |
 * | h        | calendar         | fixed               |
 * | d        | calendar         | fixed               |
 * | w        | calendar         | N/A - disallowed    |
 * | M        | calendar         | N/A - disallowed    |
 * | y        | calendar         | N/A - disallowed    |
 *
 */
export function parseEsInterval(interval: string) {
  const matches = String(mapToEquivalentInterval(interval)).trim().match(ES_INTERVAL_STRING_REGEX);

  if (!matches) {
    throw new InvalidEsIntervalFormatError(interval);
  }

  const value = parseFloat(matches[1]);
  const unit = matches[2] as Unit;
  const type = dateMath.unitsMap[unit].type;

  if (type === 'calendar' && value !== 1) {
    throw new InvalidEsCalendarIntervalError(interval, value, unit, type);
  }

  return {
    value,
    unit,
    type:
      (type === 'mixed' && value === 1) || type === 'calendar'
        ? ('calendar' as 'calendar')
        : ('fixed' as 'fixed'),
  };
}
