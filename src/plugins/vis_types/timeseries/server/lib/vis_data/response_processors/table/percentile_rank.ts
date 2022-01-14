/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { last } from 'lodash';
import { getSplits, getAggValue, getLastMetric } from '../../helpers';
import { toPercentileNumber } from '../../../../../common/to_percentile_number';
import { TSVB_METRIC_TYPES } from '../../../../../common/enums';

import type { TableResponseProcessorsFunction } from './types';
import type { PanelDataArray } from '../../../../../common/types/vis_data';

export const percentileRank: TableResponseProcessorsFunction =
  ({ response, panel, series, meta, extractFields }) =>
  (next) =>
  async (results) => {
    const metric = getLastMetric(series);

    if (metric.type !== TSVB_METRIC_TYPES.PERCENTILE_RANK) {
      return next(results);
    }

    (await getSplits(response, panel, series, meta, extractFields)).forEach((split) => {
      // table allows only one percentile rank in a series (the last one will be chosen in case of several)
      const lastRankValue = last(metric.values) ?? 0;
      const lastPercentileNumber = toPercentileNumber(lastRankValue);

      const data = split.timeseries.buckets.map((b) => [
        b.key,
        getAggValue(b, {
          ...metric,
          value: lastPercentileNumber,
        }),
      ]) as PanelDataArray[];

      results.push({
        data,
        id: split.id,
        label: `${split.label} (${lastRankValue ?? 0})`,
      });
    });

    return next(results);
  };
