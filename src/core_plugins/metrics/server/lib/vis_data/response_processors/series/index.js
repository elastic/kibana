import percentile from './percentile';
import seriesAgg from './series_agg';
import stdDeviationBands from './std_deviation_bands';
import stdDeviationSibling from './std_deviation_sibling';
import stdMetric from './std_metric';
import stdSibling from './std_sibling';
import timeShift from './time_shift';
import { dropLastBucket } from './drop_last_bucket';
import { mathAgg } from './math';

export default [
  percentile,
  stdDeviationBands,
  stdDeviationSibling,
  stdMetric,
  stdSibling,
  mathAgg,
  seriesAgg,
  timeShift,
  dropLastBucket
];

