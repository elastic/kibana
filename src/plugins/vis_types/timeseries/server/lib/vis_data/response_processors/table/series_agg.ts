/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { last } from 'lodash';

import { calculateLabel } from '../../../../../common/calculate_label';
import { SERIES_SEPARATOR } from '../../../../../common/constants';

// @ts-expect-error no typed yet
import { SeriesAgg } from './_series_agg';

import type { TableResponseProcessorsFunction } from './types';
import type { PanelDataArray } from '../../../../../common/types/vis_data';

export const seriesAgg: TableResponseProcessorsFunction =
  ({ series, meta, extractFields }) =>
  (next) =>
  async (results) => {
    if (series.aggregate_by && series.aggregate_function) {
      const targetSeries: PanelDataArray[][] = [];

      // Filter out the seires with the matching metric and store them
      // in targetSeries
      results = results.filter((s) => {
        if (s.id && s.id.split(SERIES_SEPARATOR)[0] === series.id) {
          targetSeries.push(s.data!);
          return false;
        }
        return true;
      });

      const fn = SeriesAgg[series.aggregate_function];
      const data = fn(targetSeries);
      const fieldsForSeries = meta.dataViewId ? await extractFields({ id: meta.dataViewId }) : [];

      results.push({
        id: `${series.id}`,
        label:
          series.label || calculateLabel(last(series.metrics)!, series.metrics, fieldsForSeries),
        data: data[0],
      });
    }

    return next(results);
  };
