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

import { MovingAverageAgg } from '../aggs/moving_average';
import { DerivativeAgg } from '../aggs/derivative';
import Calculation from '../aggs/calculation';
import StdAgg from '../aggs/std_agg';
import Percentile from '../aggs/percentile';
import CumulativeSum from '../aggs/cumulative_sum';
import { StandardDeviationAgg } from '../aggs/std_deviation';
import { StandardSiblingAgg } from '../aggs/std_sibling';
import SeriesAgg from '../aggs/series_agg';
import { SerialDiffAgg } from '../aggs/serial_diff';
import { PositiveOnlyAgg } from '../aggs/positive_only';
import { FilterRatioAgg } from '../aggs/filter_ratio';
import { PercentileRankAgg } from '../aggs/percentile_rank';
import { Static } from '../aggs/static';
import MathAgg from '../aggs/math';
import { TopHitAgg } from '../aggs/top_hit';
export default {
  count: StdAgg,
  avg: StdAgg,
  max: StdAgg,
  min: StdAgg,
  sum: StdAgg,
  std_deviation: StandardDeviationAgg,
  sum_of_squares: StdAgg,
  variance: StdAgg,
  avg_bucket: StandardSiblingAgg,
  max_bucket: StandardSiblingAgg,
  min_bucket: StandardSiblingAgg,
  sum_bucket: StandardSiblingAgg,
  variance_bucket: StandardSiblingAgg,
  sum_of_squares_bucket: StandardSiblingAgg,
  std_deviation_bucket: StandardSiblingAgg,
  percentile: Percentile,
  percentile_rank: PercentileRankAgg,
  cardinality: StdAgg,
  value_count: StdAgg,
  calculation: Calculation,
  cumulative_sum: CumulativeSum,
  moving_average: MovingAverageAgg,
  derivative: DerivativeAgg,
  series_agg: SeriesAgg,
  serial_diff: SerialDiffAgg,
  filter_ratio: FilterRatioAgg,
  positive_only: PositiveOnlyAgg,
  static: Static,
  math: MathAgg,
  top_hit: TopHitAgg,
};
