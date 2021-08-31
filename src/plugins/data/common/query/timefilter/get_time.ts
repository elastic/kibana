/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dateMath from '@elastic/datemath';
import { buildRangeFilter } from '@kbn/es-query';
import type { IIndexPattern, TimeRange, TimeRangeBounds, RangeFilterParams } from '../..';

interface CalculateBoundsOptions {
  forceNow?: Date;
}

export function calculateBounds(
  timeRange: TimeRange,
  options: CalculateBoundsOptions = {}
): TimeRangeBounds {
  return {
    min: dateMath.parse(timeRange.from, { forceNow: options.forceNow }),
    max: dateMath.parse(timeRange.to, { roundUp: true, forceNow: options.forceNow }),
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
  options?: { forceNow?: Date; fieldName?: string; coerceToAbsoluteTime?: boolean }
) {
  return createTimeRangeFilter(
    indexPattern,
    timeRange,
    options?.fieldName || indexPattern?.timeFieldName,
    options?.forceNow,
    options?.coerceToAbsoluteTime
  );
}

function createTimeRangeFilter(
  indexPattern: IIndexPattern | undefined,
  timeRange: TimeRange,
  fieldName?: string,
  forceNow?: Date,
  coerceToAbsoluteTime: boolean = true
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

  const rangeFilterParams: RangeFilterParams = {};

  if (coerceToAbsoluteTime) {
    const bounds = calculateBounds(timeRange, { forceNow });
    if (!bounds) {
      return;
    }
    if (bounds.min) rangeFilterParams.gte = bounds.min.toISOString();
    if (bounds.max) rangeFilterParams.lte = bounds.max.toISOString();
    rangeFilterParams.format = 'strict_date_optional_time';
  } else {
    rangeFilterParams.gte = timeRange.from;
    rangeFilterParams.lte = timeRange.to;
  }

  return buildRangeFilter(field, rangeFilterParams, indexPattern);
}
