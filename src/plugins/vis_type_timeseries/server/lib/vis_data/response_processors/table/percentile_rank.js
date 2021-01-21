/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { last } from 'lodash';
import { getSplits } from '../../helpers/get_splits';
import { getLastMetric } from '../../helpers/get_last_metric';
import { toPercentileNumber } from '../../../../../common/to_percentile_number';
import { getAggValue } from '../../helpers/get_agg_value';
import { METRIC_TYPES } from '../../../../../common/metric_types';

export function percentileRank(bucket, panel, series, meta, extractFields) {
  return (next) => async (results) => {
    const metric = getLastMetric(series);

    if (metric.type !== METRIC_TYPES.PERCENTILE_RANK) {
      return next(results);
    }

    const fakeResp = {
      aggregations: bucket,
    };

    (await getSplits(fakeResp, panel, series, meta, extractFields)).forEach((split) => {
      // table allows only one percentile rank in a series (the last one will be chosen in case of several)
      const lastRankValue = last(metric.values);
      const percentileRank = toPercentileNumber(lastRankValue);

      const data = split.timeseries.buckets.map((bucket) => [
        bucket.key,
        getAggValue(bucket, {
          ...metric,
          value: percentileRank,
        }),
      ]);

      results.push({
        data,
        id: split.id,
        label: `${split.label} (${lastRankValue ?? 0})`,
      });
    });

    return next(results);
  };
}
