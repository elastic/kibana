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
import { TimeRange } from '../../../common';

// TODO: remove this
import { IndexPattern, Field } from '../../../../../legacy/core_plugins/data/public';
import { esFilters } from '../../../common';

interface CalculateBoundsOptions {
  forceNow?: Date;
}

export function calculateBounds(timeRange: TimeRange, options: CalculateBoundsOptions = {}) {
  return {
    min: dateMath.parse(timeRange.from, { forceNow: options.forceNow }),
    max: dateMath.parse(timeRange.to, { roundUp: true, forceNow: options.forceNow }),
  };
}

export function getTime(
  indexPattern: IndexPattern | undefined,
  timeRange: TimeRange,
  forceNow?: Date
) {
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
  return esFilters.buildRangeFilter(
    timefield,
    {
      ...(bounds.min && { gte: bounds.min.toISOString() }),
      ...(bounds.max && { lte: bounds.max.toISOString() }),
      format: 'strict_date_optional_time',
    },
    indexPattern
  );
}
