/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { AUTO_INTERVAL } from '../../../common/constants';
import { validateInterval } from '../../../common/validate_interval';

import type { FetchedIndexPattern, Panel, Series } from '../../../common/types';

interface IntervalParams {
  min: string;
  max: string;
  maxBuckets: number;
}

export function getInterval(
  timeField: string,
  panel: Panel,
  index: FetchedIndexPattern,
  { min, max, maxBuckets }: IntervalParams,
  series?: Series
) {
  let interval = panel.interval;
  let maxBars = panel.max_bars;

  if (series?.override_index_pattern) {
    interval = series.series_interval || AUTO_INTERVAL;
    maxBars = series.series_max_bars;
  }

  validateInterval(
    {
      min: moment.utc(min),
      max: moment.utc(max),
    },
    interval,
    maxBuckets
  );

  return {
    maxBars,
    interval: interval || AUTO_INTERVAL,
  };
}
