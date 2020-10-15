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

import { getSplits } from '../../helpers/get_splits';
import { getLastMetric } from '../../helpers/get_last_metric';
import { mapBucket } from '../../helpers/map_bucket';
import { METRIC_TYPES } from '../../../../../common/metric_types';

export function stdMetric(bucket, panel, series) {
  return (next) => (results) => {
    const metric = getLastMetric(series);

    if (metric.type === METRIC_TYPES.STD_DEVIATION && metric.mode === 'band') {
      return next(results);
    }

    if ([METRIC_TYPES.PERCENTILE_RANK, METRIC_TYPES.PERCENTILE].includes(metric.type)) {
      return next(results);
    }

    if (/_bucket$/.test(metric.type)) {
      return next(results);
    }

    const fakeResp = {
      aggregations: bucket,
    };

    getSplits(fakeResp, panel, series).forEach((split) => {
      const data = split.timeseries.buckets.map(mapBucket(metric));
      results.push({
        id: split.id,
        label: split.label,
        data,
      });
    });

    return next(results);
  };
}
