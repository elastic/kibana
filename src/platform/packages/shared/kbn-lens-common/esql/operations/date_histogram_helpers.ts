/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregationRestrictions } from '@kbn/data-plugin/common';
import { splitStringInterval } from '@kbn/data-plugin/common';
import type { IndexPattern, DateRange } from '../../types';
import type { DateHistogramIndexPatternColumn } from '../../datasources/operations';

export const AUTO_INTERVAL = 'auto';
/** Default date histogram interval when auto cannot be used. */
export const DEFAULT_DATE_HISTOGRAM_INTERVAL = '1h';

export const hasDateRange = (dateRange: DateRange | undefined) => {
  return dateRange?.fromDate != null && dateRange?.toDate != null;
};

export function restrictedInterval(aggregationRestrictions?: Partial<AggregationRestrictions>) {
  if (!aggregationRestrictions || !aggregationRestrictions.date_histogram) {
    return;
  }

  return (
    aggregationRestrictions.date_histogram.calendar_interval ||
    aggregationRestrictions.date_histogram.fixed_interval
  );
}

export function getTimeZoneAndInterval(
  column: DateHistogramIndexPatternColumn,
  indexPattern: IndexPattern
) {
  const usedField = indexPattern.getFieldByName(column.sourceField);

  if (
    usedField &&
    usedField.aggregationRestrictions &&
    usedField.aggregationRestrictions.date_histogram
  ) {
    return {
      interval: restrictedInterval(usedField.aggregationRestrictions) ?? AUTO_INTERVAL,
      timeZone: usedField.aggregationRestrictions.date_histogram.time_zone,
      usedField,
    };
  }
  return {
    usedField: undefined,
    timeZone: undefined,
    interval: column.params?.interval ?? AUTO_INTERVAL,
  };
}

const ESQL_UNIT_MAP: Record<string, [string, string]> = {
  ms: ['millisecond', 'milliseconds'],
  s: ['second', 'seconds'],
  m: ['minute', 'minutes'],
  h: ['hour', 'hours'],
  d: ['day', 'days'],
  w: ['week', 'weeks'],
  M: ['month', 'months'],
  y: ['year', 'years'],
};

export function mapToEsqlInterval(interval: string) {
  const parsed = splitStringInterval(interval);
  if (!parsed) return '1 hour';
  const { value, unit } = parsed;
  const n = value;
  const pair = ESQL_UNIT_MAP[unit];
  if (pair) {
    const word = n === 1 ? pair[0] : pair[1];
    return `${n} ${word}`;
  }
  return interval;
}
