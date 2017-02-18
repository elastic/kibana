import MovingAverage from '../aggs/moving_average';
import Derivative from '../aggs/derivative';
import Calculation from '../aggs/calculation';
import StdAgg from '../aggs/std_agg';
import Percentile from '../aggs/percentile';
import CumulativeSum from '../aggs/cumulative_sum';
import StdDeviation from '../aggs/std_deviation';
import StdSibling from '../aggs/std_sibling';
import SeriesAgg from '../aggs/series_agg';
import SerialDiff from '../aggs/serial_diff';
import FilterRatio from '../aggs/filter_ratio';
export default {
  count: StdAgg,
  avg: StdAgg,
  max: StdAgg,
  min: StdAgg,
  sum: StdAgg,
  std_deviation: StdDeviation,
  sum_of_squares: StdAgg,
  variance: StdAgg,
  avg_bucket: StdSibling,
  max_bucket: StdSibling,
  min_bucket: StdSibling,
  sum_bucket: StdSibling,
  variance_bucket: StdSibling,
  sum_of_squares_bucket: StdSibling,
  std_deviation_bucket: StdSibling,
  percentile: Percentile,
  cardinality: StdAgg,
  value_count: StdAgg,
  calculation: Calculation,
  cumulative_sum: CumulativeSum,
  moving_average: MovingAverage,
  derivative: Derivative,
  series_agg: SeriesAgg,
  serial_diff: SerialDiff,
  filter_ratio: FilterRatio
};


