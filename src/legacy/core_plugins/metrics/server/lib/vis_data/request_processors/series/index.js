/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { query } from './query';
import { splitByEverything } from './split_by_everything';
import { splitByFilter } from './split_by_filter';
import { splitByFilters } from './split_by_filters';
import { splitByTerms } from './split_by_terms';
import { dateHistogram } from './date_histogram';
import { metricBuckets } from './metric_buckets';
import { siblingBuckets } from './sibling_buckets';
import { ratios as filterRatios } from './filter_ratios';
import { normalizeQuery } from './normalize_query';

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
  normalizeQuery,
];
