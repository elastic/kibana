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

import _ from 'lodash';
import { getAggValue } from '../../helpers/get_agg_value';
import { getDefaultDecoration } from '../../helpers/get_default_decoration';
import { getSplits } from '../../helpers/get_splits';
import { getLastMetric } from '../../helpers/get_last_metric';
import { METRIC_TYPES } from '../../../../../common/metric_types';

export function percentile(resp, panel, series, meta) {
  return next => results => {
    const metric = getLastMetric(series);

    if (metric.type !== METRIC_TYPES.PERCENTILE) {
      return next(results);
    }

    getSplits(resp, panel, series, meta).forEach(split => {
      metric.percentiles.forEach(percentile => {
        const percentileValue = percentile.value ? percentile.value : 0;
        const label = `${split.label} (${percentileValue})`;
        const data = split.timeseries.buckets.map(bucket => {
          const m = _.assign({}, metric, { percent: percentileValue });
          return [bucket.key, getAggValue(bucket, m)];
        });
        if (percentile.mode === 'band') {
          const fillData = split.timeseries.buckets.map(bucket => {
            const m = _.assign({}, metric, { percent: percentile.percentile });
            return [bucket.key, getAggValue(bucket, m)];
          });
          results.push({
            id: `${split.id}:${percentile.id}`,
            color: split.color,
            label,
            data,
            lines: { show: true, fill: percentile.shade, lineWidth: 0 },
            points: { show: false },
            legend: false,
            fillBetween: `${split.id}:${percentile.id}:${percentile.percentile}`,
          });
          results.push({
            id: `${split.id}:${percentile.id}:${percentile.percentile}`,
            color: split.color,
            label,
            data: fillData,
            lines: { show: true, fill: false, lineWidth: 0 },
            legend: false,
            points: { show: false },
          });
        } else {
          const decoration = getDefaultDecoration(series);
          results.push({
            id: `${split.id}:${percentile.id}`,
            color: split.color,
            label,
            data,
            ...decoration,
          });
        }
      });
    });
    return next(results);
  };
}
