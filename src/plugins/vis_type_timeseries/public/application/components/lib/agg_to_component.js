/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { MovingAverageAgg } from '../aggs/moving_average';
import { DerivativeAgg } from '../aggs/derivative';
import { CalculationAgg } from '../aggs/calculation';
import { StandardAgg } from '../aggs/std_agg';
import { PercentileAgg } from '../aggs/percentile';
import { CumulativeSumAgg } from '../aggs/cumulative_sum';
import { StandardDeviationAgg } from '../aggs/std_deviation';
import { StandardSiblingAgg } from '../aggs/std_sibling';
import { SeriesAgg } from '../aggs/series_agg';
import { SerialDiffAgg } from '../aggs/serial_diff';
import { PositiveOnlyAgg } from '../aggs/positive_only';
import { FilterRatioAgg } from '../aggs/filter_ratio';
import { PercentileRankAgg } from '../aggs/percentile_rank';
import { Static } from '../aggs/static';
import { MathAgg } from '../aggs/math';
import { TopHitAgg } from '../aggs/top_hit';
import { PositiveRateAgg } from '../aggs/positive_rate';

export const aggToComponent = {
  count: StandardAgg,
  avg: StandardAgg,
  max: StandardAgg,
  min: StandardAgg,
  sum: StandardAgg,
  std_deviation: StandardDeviationAgg,
  sum_of_squares: StandardAgg,
  variance: StandardAgg,
  avg_bucket: StandardSiblingAgg,
  max_bucket: StandardSiblingAgg,
  min_bucket: StandardSiblingAgg,
  sum_bucket: StandardSiblingAgg,
  variance_bucket: StandardSiblingAgg,
  sum_of_squares_bucket: StandardSiblingAgg,
  std_deviation_bucket: StandardSiblingAgg,
  percentile: PercentileAgg,
  percentile_rank: PercentileRankAgg,
  cardinality: StandardAgg,
  value_count: StandardAgg,
  calculation: CalculationAgg,
  cumulative_sum: CumulativeSumAgg,
  moving_average: MovingAverageAgg,
  derivative: DerivativeAgg,
  series_agg: SeriesAgg,
  serial_diff: SerialDiffAgg,
  filter_ratio: FilterRatioAgg,
  positive_only: PositiveOnlyAgg,
  static: Static,
  math: MathAgg,
  top_hit: TopHitAgg,
  positive_rate: PositiveRateAgg,
};
