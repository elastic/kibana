/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { last, first } from 'lodash';
import { SeriesAgg } from './_series_agg';
import { getDefaultDecoration } from '../../helpers/get_default_decoration';
import { calculateLabel } from '../../../../../common/calculate_label';
import { SERIES_SEPARATOR } from '../../../../../common/constants';

export function seriesAgg(resp, panel, series, meta, extractFields) {
  return (next) => async (results) => {
    if (series.metrics.some((m) => m.type === 'series_agg')) {
      const decoration = getDefaultDecoration(series);

      const targetSeries = [];
      // Filter out the seires with the matching metric and store them
      // in targetSeries
      results = results.filter((s) => {
        if (s.id.split(SERIES_SEPARATOR)[0] === series.id) {
          targetSeries.push(s.data);
          return false;
        }
        return true;
      });
      const data = series.metrics
        .filter((m) => m.type === 'series_agg')
        .reduce((acc, m) => {
          const fn = SeriesAgg[m.function];
          return (fn && fn(acc)) || acc;
        }, targetSeries);

      const fieldsForSeries = meta.dataViewId ? await extractFields({ id: meta.dataViewId }) : [];

      results.push({
        id: `${series.id}`,
        label:
          series.label || calculateLabel(last(series.metrics), series.metrics, fieldsForSeries),
        color: series.color,
        data: first(data),
        ...decoration,
      });
    }
    return next(results);
  };
}
