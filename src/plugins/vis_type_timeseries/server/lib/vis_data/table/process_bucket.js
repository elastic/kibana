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

import { buildProcessorFunction } from '../build_processor_function';
import { processors } from '../response_processors/table';
import { getLastValue } from '../../../../common/get_last_value';
import { first, get } from 'lodash';
import { overwrite } from '../helpers';
import { getActiveSeries } from '../helpers/get_active_series';

function trendSinceLastBucket(data) {
  if (data.length < 2) {
    return 0;
  }
  const currentBucket = data[data.length - 1];
  const prevBucket = data[data.length - 2];
  const trend = (currentBucket[1] - prevBucket[1]) / currentBucket[1];
  return Number.isNaN(trend) ? 0 : trend;
}

export function processBucket(panel) {
  return (bucket) => {
    const series = getActiveSeries(panel).map((series) => {
      const timeseries = get(bucket, `${series.id}.timeseries`);
      const buckets = get(bucket, `${series.id}.buckets`);

      if (!timeseries && buckets) {
        const meta = get(bucket, `${series.id}.meta`);
        const timeseries = {
          buckets: get(bucket, `${series.id}.buckets`),
        };
        overwrite(bucket, series.id, { meta, timeseries });
      }
      const processor = buildProcessorFunction(processors, bucket, panel, series);
      const result = first(processor([]));
      if (!result) return null;
      const data = get(result, 'data', []);
      result.slope = trendSinceLastBucket(data);
      result.last = getLastValue(data);
      return result;
    });
    return { key: bucket.key, series };
  };
}
