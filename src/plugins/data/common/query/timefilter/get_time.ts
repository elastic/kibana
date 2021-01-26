/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import dateMath from '@elastic/datemath';
import { buildRangeFilter, IIndexPattern, TimeRange, TimeRangeBounds } from '../..';

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
  options?: { forceNow?: Date; fieldName?: string }
) {
  return createTimeRangeFilter(
    indexPattern,
    timeRange,
    options?.fieldName || indexPattern?.timeFieldName,
    options?.forceNow
  );
}

function createTimeRangeFilter(
  indexPattern: IIndexPattern | undefined,
  timeRange: TimeRange,
  fieldName?: string,
  forceNow?: Date
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

  const bounds = calculateBounds(timeRange, { forceNow });
  if (!bounds) {
    return;
  }
  return buildRangeFilter(
    field,
    {
      ...(bounds.min && { gte: bounds.min.toISOString() }),
      ...(bounds.max && { lte: bounds.max.toISOString() }),
      format: 'strict_date_optional_time',
    },
    indexPattern
  );
}
