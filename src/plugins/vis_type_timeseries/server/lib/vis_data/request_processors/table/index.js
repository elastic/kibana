/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { pivot } from './pivot';
import { query } from './query';
import { splitByEverything } from './split_by_everything';
import { splitByTerms } from './split_by_terms';
import { dateHistogram } from './date_histogram';
import { metricBuckets } from './metric_buckets';
import { siblingBuckets } from './sibling_buckets';
import { ratios as filterRatios } from './filter_ratios';
import { normalizeQuery } from './normalize_query';
import { positiveRate } from './positive_rate';

export const processors = [
  query,
  pivot,
  splitByTerms,
  splitByEverything,
  dateHistogram,
  metricBuckets,
  siblingBuckets,
  filterRatios,
  positiveRate,
  normalizeQuery,
];
