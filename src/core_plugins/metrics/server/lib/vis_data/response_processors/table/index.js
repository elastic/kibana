// import percentile from './percentile';
import stdMetric from './std_metric';
import stdSibling from './std_sibling';
import seriesAgg from './series_agg';
import { math } from './math';
import { dropLastBucketFn } from './drop_last_bucket';

export default [
  // percentile,
  stdMetric,
  stdSibling,
  math,
  seriesAgg,
  dropLastBucketFn
];

