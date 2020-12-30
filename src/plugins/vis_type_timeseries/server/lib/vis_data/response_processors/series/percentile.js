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

import { getAggValue } from '../../helpers/get_agg_value';
import { getDefaultDecoration } from '../../helpers/get_default_decoration';
import { getSplits } from '../../helpers/get_splits';
import { getLastMetric } from '../../helpers/get_last_metric';
import { METRIC_TYPES } from '../../../../../common/metric_types';

export function percentile(resp, panel, series, meta) {
  return (next) => (results) => {
    const metric = getLastMetric(series);

    if (metric.type !== METRIC_TYPES.PERCENTILE) {
      return next(results);
    }

    getSplits(resp, panel, series, meta).forEach((split) => {
      metric.percentiles.forEach((percentile) => {
        const percentileValue = percentile.value ? percentile.value : 0;
        const id = `${split.id}:${percentile.id}`;
        const data = split.timeseries.buckets.map((bucket) => {
          const higherMetric = { ...metric, percent: percentileValue };
          const serieData = [bucket.key, getAggValue(bucket, higherMetric)];

          if (percentile.mode === 'band') {
            const lowerMetric = { ...metric, percent: percentile.percentile };
            serieData.push(getAggValue(bucket, lowerMetric));
          }

          return serieData;
        });
        if (percentile.mode === 'band') {
          results.push({
            id,
            color: split.color,
            label: split.label,
            data,
            lines: {
              show: series.chart_type === 'line',
              fill: Number(percentile.shade),
              lineWidth: 0,
              mode: 'band',
            },
            bars: {
              show: series.chart_type === 'bar',
              fill: Number(percentile.shade),
              mode: 'band',
            },
            points: { show: false },
            y1AccessorFormat: ` (${percentileValue})`,
            y0AccessorFormat: ` (${percentile.percentile})`,
          });
        } else {
          const decoration = getDefaultDecoration(series);
          results.push({
            id,
            color: split.color,
            label: `${split.label} (${percentileValue})`,
            data,
            ...decoration,
          });
        }
      });
    });
    return next(results);
  };
}
