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
import { METRIC_TYPES } from '../../../../../common/metric_types';

export function percentile(bucket, panel, series, meta, extractFields) {
  return (next) => async (results) => {
    const metric = getLastMetric(series);

    if (metric.type !== METRIC_TYPES.PERCENTILE) {
      return next(results);
    }

    const fakeResp = {
      aggregations: bucket,
    };

    (await getSplits(fakeResp, panel, series, meta, extractFields)).forEach((split) => {
      // table allows only one percentile in a series (the last one will be chosen in case of several)
      const percentile = last(metric.percentiles);
      const percentileKey = toPercentileNumber(percentile.value);
      const data = split.timeseries.buckets.map((bucket) => [
        bucket.key,
        bucket[metric.id].values[percentileKey],
      ]);

      results.push({
        id: split.id,
        label: `${split.label} (${percentile.value ?? 0})`,
        data,
      });
    });

    return next(results);
  };
}
