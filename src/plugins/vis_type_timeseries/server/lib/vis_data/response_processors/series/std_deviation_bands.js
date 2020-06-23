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

import { getAggValue, getLastMetric, getSplits } from '../../helpers';
import { METRIC_TYPES } from '../../../../../common/metric_types';

export function stdDeviationBands(resp, panel, series, meta) {
  return (next) => (results) => {
    const metric = getLastMetric(series);
    if (metric.type === METRIC_TYPES.STD_DEVIATION && metric.mode === 'band') {
      getSplits(resp, panel, series, meta).forEach(({ id, color, label, timeseries }) => {
        const data = timeseries.buckets.map((bucket) => [
          bucket.key,
          getAggValue(bucket, { ...metric, mode: 'upper' }),
          getAggValue(bucket, { ...metric, mode: 'lower' }),
        ]);

        results.push({
          id,
          label,
          color,
          data,
          lines: {
            show: series.chart_type === 'line',
            fill: 0.5,
            lineWidth: 0,
            mode: 'band',
          },
          bars: {
            show: series.chart_type === 'bar',
            fill: 0.5,
            mode: 'band',
          },
          points: { show: false },
        });
      });
    }
    return next(results);
  };
}
