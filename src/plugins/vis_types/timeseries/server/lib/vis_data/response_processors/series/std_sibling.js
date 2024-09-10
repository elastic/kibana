/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDefaultDecoration } from '../../helpers/get_default_decoration';
import { getSplits } from '../../helpers/get_splits';
import { getLastMetric } from '../../helpers/get_last_metric';
import { getSiblingAggValue } from '../../helpers/get_sibling_agg_value';

export function stdSibling(resp, panel, series, meta, extractFields) {
  return (next) => async (results) => {
    const metric = getLastMetric(series);

    if (!/_bucket$/.test(metric.type)) return next(results);
    if (metric.type === 'std_deviation_bucket' && metric.mode === 'band') return next(results);

    const decoration = getDefaultDecoration(series);
    (await getSplits(resp, panel, series, meta, extractFields)).forEach((split) => {
      const data = split.timeseries.buckets.map((bucket) => {
        return [bucket.key, getSiblingAggValue(split, metric)];
      });
      results.push({
        id: split.id,
        label: split.label,
        color: split.color,
        data,
        ...decoration,
      });
    });

    return next(results);
  };
}
