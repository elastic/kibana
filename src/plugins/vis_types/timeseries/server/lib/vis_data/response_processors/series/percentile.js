/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAggValue } from '../../helpers/get_agg_value';
import { getDefaultDecoration } from '../../helpers/get_default_decoration';
import { getSplits } from '../../helpers/get_splits';
import { getLastMetric } from '../../helpers/get_last_metric';
import { TSVB_METRIC_TYPES } from '../../../../../common/enums';
import { SERIES_SEPARATOR } from '../../../../../common/constants';

export function percentile(resp, panel, series, meta, extractFields) {
  return (next) => async (results) => {
    const metric = getLastMetric(series);

    if (metric.type !== TSVB_METRIC_TYPES.PERCENTILE) {
      return next(results);
    }

    (await getSplits(resp, panel, series, meta, extractFields)).forEach((split) => {
      metric.percentiles.forEach((percentile) => {
        const percentileValue = percentile.value ? percentile.value : 0;
        const id = `${split.id}${SERIES_SEPARATOR}${percentile.id}`;
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
            color:
              series.split_mode === 'everything' && percentile.color
                ? percentile.color
                : split.color,
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
            color:
              series.split_mode === 'everything' && percentile.color
                ? percentile.color
                : split.color,
            label: `(${percentileValue}) ${split.label}`,
            data,
            ...decoration,
          });
        }
      });
    });
    return next(results);
  };
}
