/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
