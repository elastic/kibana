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

import moment from 'moment';
import { buildRangeFilter } from '@kbn/es-query';
import { IBucketDateHistogramAggConfig } from '../date_histogram';

export const createFilterDateHistogram = (
  agg: IBucketDateHistogramAggConfig,
  key: string | number
) => {
  const start = moment(key);
  const interval = agg.buckets.getInterval();

  return buildRangeFilter(
    agg.params.field,
    {
      gte: start.toISOString(),
      lt: start.add(interval).toISOString(),
      format: 'strict_date_optional_time',
    },
    agg.getIndexPattern()
  );
};
