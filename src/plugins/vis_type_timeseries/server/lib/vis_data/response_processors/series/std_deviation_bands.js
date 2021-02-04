/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAggValue, getLastMetric, getSplits } from '../../helpers';
import { METRIC_TYPES } from '../../../../../common/metric_types';

export function stdDeviationBands(resp, panel, series, meta, extractFields) {
  return (next) => async (results) => {
    const metric = getLastMetric(series);
    if (metric.type === METRIC_TYPES.STD_DEVIATION && metric.mode === 'band') {
      (await getSplits(resp, panel, series, meta, extractFields)).forEach(
        ({ id, color, label, timeseries }) => {
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
        }
      );
    }
    return next(results);
  };
}
