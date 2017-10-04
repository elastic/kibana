import { MovingAverageAgg } from '../../components/aggs/moving_average';
import { DerivativeAgg } from '../../components/aggs/derivative';
import Calculation from '../../components/aggs/calculation';
import StdAgg from '../../components/aggs/std_agg';
import Percentile from '../../components/aggs/percentile';
import CumulativeSum from '../../components/aggs/cumulative_sum';
import { StandardDeviationAgg } from '../../components/aggs/std_deviation';
import { StandardSiblingAgg } from '../../components/aggs/std_sibling';
import SeriesAgg from '../../components/aggs/series_agg';
import { SerialDiffAgg } from '../../components/aggs/serial_diff';
import { PositiveOnlyAgg } from '../../components/aggs/positive_only';
import { FilterRatioAgg } from '../../components/aggs/filter_ratio';
import { PercentileRankAgg } from '../../components/aggs/percentile_rank';
import { Static } from '../../components/aggs/static';
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
  static: Static
};
