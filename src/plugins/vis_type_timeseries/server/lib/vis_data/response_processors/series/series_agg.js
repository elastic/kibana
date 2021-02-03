/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SeriesAgg } from './_series_agg';
import _ from 'lodash';
import { getDefaultDecoration } from '../../helpers/get_default_decoration';
import { calculateLabel } from '../../../../../common/calculate_label';

export function seriesAgg(resp, panel, series, meta, extractFields) {
  return (next) => async (results) => {
    if (series.metrics.some((m) => m.type === 'series_agg')) {
      const decoration = getDefaultDecoration(series);

      const targetSeries = [];
      // Filter out the seires with the matching metric and store them
      // in targetSeries
      results = results.filter((s) => {
        if (s.id.split(/:/)[0] === series.id) {
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

      const fieldsForMetaIndex = meta.index ? await extractFields(meta.index) : [];

      results.push({
        id: `${series.id}`,
        label:
          series.label ||
          calculateLabel(_.last(series.metrics), series.metrics, fieldsForMetaIndex),
        color: series.color,
        data: _.first(data),
        ...decoration,
      });
    }
    return next(results);
  };
}
