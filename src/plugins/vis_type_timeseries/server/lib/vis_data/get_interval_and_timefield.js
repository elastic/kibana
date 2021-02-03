/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { AUTO_INTERVAL } from '../../../common/constants';

const DEFAULT_TIME_FIELD = '@timestamp';

export function getIntervalAndTimefield(panel, series = {}, indexPatternObject) {
  const getDefaultTimeField = () => indexPatternObject?.timeFieldName ?? DEFAULT_TIME_FIELD;

  const timeField =
    (series.override_index_pattern && series.series_time_field) ||
    panel.time_field ||
    getDefaultTimeField();

  let interval = panel.interval;
  let maxBars = panel.max_bars;

  if (series.override_index_pattern) {
    interval = series.series_interval;
    maxBars = series.series_max_bars;
  }

  return {
    timeField,
    interval: interval || AUTO_INTERVAL,
    maxBars,
  };
}
