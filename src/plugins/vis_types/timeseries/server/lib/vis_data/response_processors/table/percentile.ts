/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { last } from 'lodash';
import { getSplits, getLastMetric } from '../../helpers';
import { toPercentileNumber } from '../../../../../common/to_percentile_number';
import { TSVB_METRIC_TYPES } from '../../../../../common/enums';

import type { TableResponseProcessorsFunction } from './types';
import type { PanelDataArray } from '../../../../../common/types/vis_data';

export const percentile: TableResponseProcessorsFunction =
  ({ response, panel, series, meta, extractFields }) =>
  (next) =>
  async (results) => {
    const metric = getLastMetric(series);

    if (metric.type !== TSVB_METRIC_TYPES.PERCENTILE) {
      return next(results);
    }

    (await getSplits(response, panel, series, meta, extractFields)).forEach((split) => {
      // table allows only one percentile in a series (the last one will be chosen in case of several)
      const lastPercentile = last(metric.percentiles)?.value ?? 0;
      const percentileKey = toPercentileNumber(lastPercentile);
      const data = split.timeseries.buckets.map((b) => [
        b.key,
        b[metric.id].values[percentileKey],
      ]) as PanelDataArray[];

      results.push({
        id: split.id,
        label: `${split.label} (${lastPercentile ?? 0})`,
        data: data!,
      });
    });

    return next(results);
  };
