/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { percentile } from './percentile';
import { percentileRank } from './percentile_rank';

import { seriesAgg } from './series_agg';
import { stdDeviationBands } from './std_deviation_bands';
import { stdDeviationSibling } from './std_deviation_sibling';
import { stdMetric } from './std_metric';
import { stdSibling } from './std_sibling';
import { timeShift } from './time_shift';
import { dropLastBucket } from './drop_last_bucket';
import { mathAgg } from './math';
import { formatLabel } from './format_label';

export const processors = [
  percentile,
  percentileRank,
  stdDeviationBands,
  stdDeviationSibling,
  stdMetric,
  stdSibling,
  mathAgg,
  seriesAgg,
  timeShift,
  dropLastBucket,
  formatLabel,
];
