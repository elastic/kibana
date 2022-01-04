/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSplits, getLastMetric, mapEmptyToZero } from '../../helpers';
import { TSVB_METRIC_TYPES } from '../../../../../common/enums';

import type { TableResponseProcessorsFunction } from './types';

export const stdMetric: TableResponseProcessorsFunction =
  ({ response, panel, series, meta, extractFields }) =>
  (next) =>
  async (results) => {
    const metric = getLastMetric(series);

    if (metric.type === TSVB_METRIC_TYPES.STD_DEVIATION && metric.mode === 'band') {
      return next(results);
    }

    if (
      [TSVB_METRIC_TYPES.PERCENTILE_RANK, TSVB_METRIC_TYPES.PERCENTILE].includes(
        metric.type as TSVB_METRIC_TYPES
      )
    ) {
      return next(results);
    }

    if (/_bucket$/.test(metric.type)) {
      return next(results);
    }

    (await getSplits(response, panel, series, meta, extractFields)).forEach((split) => {
      const data = mapEmptyToZero(metric, split.timeseries.buckets);
      results.push({
        id: split.id,
        label: split.label,
        data,
      });
    });

    return next(results);
  };
