/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getDefaultDecoration, getSplits, getLastMetric, mapEmptyToZero } from '../../helpers';
import { TSVB_METRIC_TYPES } from '../../../../../common/enums';

export function stdMetric(resp, panel, series, meta, extractFields) {
  return (next) => async (results) => {
    const metric = getLastMetric(series);
    if (metric.type === TSVB_METRIC_TYPES.STD_DEVIATION && metric.mode === 'band') {
      return next(results);
    }

    if ([TSVB_METRIC_TYPES.PERCENTILE_RANK, TSVB_METRIC_TYPES.PERCENTILE].includes(metric.type)) {
      return next(results);
    }
    if (/_bucket$/.test(metric.type)) return next(results);
    const decoration = getDefaultDecoration(series);

    (await getSplits(resp, panel, series, meta, extractFields)).forEach((split) => {
      const data = mapEmptyToZero(metric, split.timeseries.buckets);
      results.push({
        id: `${split.id}`,
        label: split.label,
        splitByLabel: split.splitByLabel,
        labelFormatted: split.labelFormatted,
        termsSplitKey: split.termsSplitKey,
        color: split.color,
        data,
        ...decoration,
      });
    });

    return next(results);
  };
}
