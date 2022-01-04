/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSplits, getLastMetric, getSiblingAggValue } from '../../helpers';

import type { TableResponseProcessorsFunction } from './types';
import type { PanelDataArray } from '../../../../../common/types/vis_data';

export const stdSibling: TableResponseProcessorsFunction =
  ({ response, panel, series, meta, extractFields }) =>
  (next) =>
  async (results) => {
    const metric = getLastMetric(series);

    if (!/_bucket$/.test(metric.type)) return next(results);
    if (metric.type === 'std_deviation_bucket' && metric.mode === 'band') return next(results);

    (await getSplits(response, panel, series, meta, extractFields)).forEach((split) => {
      const data: PanelDataArray[] = split.timeseries.buckets.map((b) => {
        return [b.key, getSiblingAggValue(split, metric)];
      });

      results.push({
        id: split.id,
        label: split.label,
        data,
      });
    });

    return next(results);
  };
