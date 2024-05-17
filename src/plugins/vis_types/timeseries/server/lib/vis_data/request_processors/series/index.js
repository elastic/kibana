/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { dateHistogram } from './date_histogram';
import { ratios as filterRatios } from './filter_ratios';
import { metricBuckets } from './metric_buckets';
import { normalizeQuery } from './normalize_query';
import { positiveRate } from './positive_rate';
import { query } from './query';
import { siblingBuckets } from './sibling_buckets';
import { splitByEverything } from './split_by_everything';
import { splitByFilter } from './split_by_filter';
import { splitByFilters } from './split_by_filters';
import { splitByTerms } from './split_by_terms';

export const processors = [
  query,
  splitByTerms,
  splitByFilter,
  splitByFilters,
  splitByEverything,
  dateHistogram,
  metricBuckets,
  siblingBuckets,
  filterRatios,
  positiveRate,
  normalizeQuery,
];
