/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getAggValue } from '../../helpers/get_agg_value';
import { getDefaultDecoration } from '../../helpers/get_default_decoration';
import { getSplits } from '../../helpers/get_splits';
import { getLastMetric } from '../../helpers/get_last_metric';
import { toPercentileNumber } from '../../../../../common/to_percentile_number';
import { METRIC_TYPES } from '../../../../../common/metric_types';

export function percentileRank(resp, panel, series, meta, extractFields) {
  return (next) => async (results) => {
    const metric = getLastMetric(series);

    if (metric.type !== METRIC_TYPES.PERCENTILE_RANK) {
      return next(results);
    }

    (await getSplits(resp, panel, series, meta, extractFields)).forEach((split) => {
      (metric.values || []).forEach((percentileRank, index) => {
        const data = split.timeseries.buckets.map((bucket) => [
          bucket.key,
          getAggValue(bucket, {
            ...metric,
            value: toPercentileNumber(percentileRank),
          }),
        ]);

        results.push({
          data,
          id: `${split.id}:${percentileRank}:${index}`,
          label: `${split.label} (${percentileRank || 0})`,
          color: split.color,
          ...getDefaultDecoration(series),
        });
      });
    });
    return next(results);
  };
}
