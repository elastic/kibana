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
