/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getSplits, getLastMetric, getSiblingAggValue } from '../../helpers';

export function stdDeviationSibling(resp, panel, series, meta, extractFields) {
  return (next) => async (results) => {
    const metric = getLastMetric(series);
    if (metric.mode === 'band' && metric.type === 'std_deviation_bucket') {
      (await getSplits(resp, panel, series, meta, extractFields)).forEach((split) => {
        const data = split.timeseries.buckets.map((bucket) => [
          bucket.key,
          getSiblingAggValue(split, { ...metric, mode: 'upper' }),
          getSiblingAggValue(split, { ...metric, mode: 'lower' }),
        ]);

        results.push({
          id: split.id,
          label: split.label,
          color: split.color,
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
          data,
        });
      });
    }

    return next(results);
  };
}
