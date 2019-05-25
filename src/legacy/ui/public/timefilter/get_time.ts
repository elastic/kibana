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
import { Field, IndexPattern } from 'ui/index_patterns';

interface CalculateBoundsOptions {
  forceNow?: Date;
}

interface TimeRange {
  to: string;
  from: string;
}

interface RangeFilter {
  gte?: string | number;
  lte?: string | number;
  format: string;
}

export interface Filter {
  range: { [s: string]: RangeFilter };
}

export function calculateBounds(timeRange: TimeRange, options: CalculateBoundsOptions = {}) {
  return {
    min: dateMath.parse(timeRange.from, { forceNow: options.forceNow }),
    max: dateMath.parse(timeRange.to, { roundUp: true, forceNow: options.forceNow }),
  };
}

export function getTime(
  indexPattern: IndexPattern,
  timeRange: TimeRange,
  forceNow?: Date
): Filter | undefined {
  if (!indexPattern) {
    // in CI, we sometimes seem to fail here.
    return;
  }

  const timefield: Field | undefined = indexPattern.fields.find(
    field => field.name === indexPattern.timeFieldName
  );

  if (!timefield) {
    return;
  }

  const bounds = calculateBounds(timeRange, { forceNow });
  if (!bounds) {
    return;
  }
  const filter: Filter = { range: { [timefield.name]: { format: 'strict_date_optional_time' } } };

  if (bounds.min) {
    filter.range[timefield.name].gte = bounds.min.toISOString();
  }

  if (bounds.max) {
    filter.range[timefield.name].lte = bounds.max.toISOString();
  }

  return filter;
}
