/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dateMath from '@kbn/datemath';
import { omitBy } from 'lodash';
import { buildRangeFilter } from '@kbn/es-query';
import type { Moment } from 'moment';
import type { IIndexPattern, TimeRange, TimeRangeBounds, RangeFilterParams } from '../..';

interface CalculateBoundsOptions {
  forceNow?: Date;
}

const calculateLowerBound = (from: string, forceNow?: Date): undefined | Moment =>
  dateMath.parse(from, { forceNow });

const calculateUpperBound = (to: string, forceNow?: Date): undefined | Moment =>
  dateMath.parse(to, { roundUp: true, forceNow });

const isRelativeTime = (value: string): boolean => value.includes('now');

export function calculateBounds(
  timeRange: TimeRange,
  options: CalculateBoundsOptions = {}
): TimeRangeBounds {
  return {
    min: calculateLowerBound(timeRange.from, options.forceNow),
    max: calculateUpperBound(timeRange.to, options.forceNow),
  };
}

export function getAbsoluteTimeRange(
  timeRange: TimeRange,
  { forceNow }: { forceNow?: Date } = {}
): TimeRange {
  const { min, max } = calculateBounds(timeRange, { forceNow });
  return {
    from: min ? min.toISOString() : timeRange.from,
    to: max ? max.toISOString() : timeRange.to,
  };
}

export function getTime(
  indexPattern: IIndexPattern | undefined,
  timeRange: TimeRange,
  options?: { forceNow?: Date; fieldName?: string }
) {
  return createTimeRangeFilter(
    indexPattern,
    timeRange,
    options?.fieldName || indexPattern?.timeFieldName,
    options?.forceNow,
    true
  );
}

export function getRelativeTime(
  indexPattern: IIndexPattern | undefined,
  timeRange: TimeRange,
  options?: { forceNow?: Date; fieldName?: string }
) {
  return createTimeRangeFilter(
    indexPattern,
    timeRange,
    options?.fieldName || indexPattern?.timeFieldName,
    options?.forceNow,
    false
  );
}

function createTimeRangeFilter(
  indexPattern: IIndexPattern | undefined,
  timeRange: TimeRange,
  fieldName?: string,
  forceNow?: Date,
  coerceRelativeTimeToAbsoluteTime: boolean = true
) {
  if (!indexPattern) {
    return;
  }
  const field = indexPattern.fields.find(
    (f) => f.name === (fieldName || indexPattern.timeFieldName)
  );
  if (!field) {
    return;
  }

  let rangeFilterParams: RangeFilterParams = {
    format: 'strict_date_optional_time',
  };

  if (coerceRelativeTimeToAbsoluteTime) {
    const bounds = calculateBounds(timeRange, { forceNow });
    if (!bounds) {
      return;
    }
    rangeFilterParams.gte = bounds.min?.toISOString();
    rangeFilterParams.lte = bounds.max?.toISOString();
  } else {
    rangeFilterParams.gte = isRelativeTime(timeRange.from)
      ? timeRange.from
      : calculateLowerBound(timeRange.from, forceNow)?.toISOString();

    rangeFilterParams.lte = isRelativeTime(timeRange.to)
      ? timeRange.to
      : calculateUpperBound(timeRange.to, forceNow)?.toISOString();
  }

  rangeFilterParams = omitBy(rangeFilterParams, (v) => v == null);

  return buildRangeFilter(field, rangeFilterParams, indexPattern);
}
