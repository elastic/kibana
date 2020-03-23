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
import { last } from 'lodash';
import { getSplits } from '../../helpers/get_splits';
import { getLastMetric } from '../../helpers/get_last_metric';
import { toPercentileNumber } from '../../../../../common/to_percentile_number';
import { METRIC_TYPES } from '../../../../../common/metric_types';

export function percentile(bucket, panel, series) {
  return next => results => {
    const metric = getLastMetric(series);

    if (metric.type !== METRIC_TYPES.PERCENTILE) {
      return next(results);
    }

    const fakeResp = {
      aggregations: bucket,
    };

    getSplits(fakeResp, panel, series).forEach(split => {
      // table allows only one percentile in a series (the last one will be chosen in case of several)
      const percentile = last(metric.percentiles);
      const percentileKey = toPercentileNumber(percentile.value);
      const data = split.timeseries.buckets.map(bucket => [
        bucket.key,
        bucket[metric.id].values[percentileKey],
      ]);

      results.push({
        id: split.id,
        data,
      });
    });

    return next(results);
  };
}
