/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { stdMetric } from './std_metric';
import { stdSibling } from './std_sibling';
import { seriesAgg } from './series_agg';
import { percentile } from './percentile';
import { percentileRank } from './percentile_rank';

import { math } from './math';
import { dropLastBucketFn } from './drop_last_bucket';

export const processors = [
  percentile,
  percentileRank,
  stdMetric,
  stdSibling,
  math,
  seriesAgg,
  dropLastBucketFn,
];
