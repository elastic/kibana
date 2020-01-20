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
];
