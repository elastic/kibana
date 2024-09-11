/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KBN_FIELD_TYPES } from '@kbn/field-types';
import dateMath from '@kbn/datemath';
import { omitBy } from 'lodash';
import { buildRangeFilter, TimeRange, RangeFilterParams } from '@kbn/es-query';
import type { Moment } from 'moment';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { TimeRangeBounds } from '../..';

export interface CalculateBoundsOptions {
  forceNow?: Date;
}

const calculateLowerBound = (from: string, forceNow?: Date): undefined | Moment =>
  dateMath.parse(from, { forceNow });

const calculateUpperBound = (to: string, forceNow?: Date): undefined | Moment =>
  dateMath.parse(to, { roundUp: true, forceNow });

const isRelativeTime = (value: string | Moment): boolean => {
  return typeof value === 'string' && value.includes('now');
};

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
  indexPattern: DataView | undefined,
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
  indexPattern: DataView | undefined,
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

function getTimeField(indexPattern?: DataView, fieldName?: string) {
  if (!indexPattern && fieldName) {
    return { name: fieldName, type: KBN_FIELD_TYPES.DATE };
  }

  if (!indexPattern) {
    return;
  }

  return indexPattern.fields.find((f) => f.name === (fieldName || indexPattern.timeFieldName));
}

function createTimeRangeFilter(
  indexPattern: DataView | undefined,
  timeRange: TimeRange,
  fieldName?: string,
  forceNow?: Date,
  coerceRelativeTimeToAbsoluteTime: boolean = true
) {
  const field = getTimeField(indexPattern, fieldName);
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

  return buildRangeFilter(field, rangeFilterParams, indexPattern!);
}
