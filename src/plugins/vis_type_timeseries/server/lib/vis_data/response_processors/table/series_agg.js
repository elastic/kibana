/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SeriesAgg } from './_series_agg';
import _ from 'lodash';
import { calculateLabel } from '../../../../../common/calculate_label';

export function seriesAgg(resp, panel, series, meta, extractFields) {
  return (next) => async (results) => {
    if (series.aggregate_by && series.aggregate_function) {
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
      const fn = SeriesAgg[series.aggregate_function];
      const data = fn(targetSeries);

      const fieldsForMetaIndex = meta.index ? await extractFields(meta.index) : [];

      results.push({
        id: `${series.id}`,
        label:
          series.label ||
          calculateLabel(_.last(series.metrics), series.metrics, fieldsForMetaIndex),
        data: _.first(data),
      });
    }
    return next(results);
  };
}
