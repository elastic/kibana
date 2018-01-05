import pivot from './pivot';
import query from './query';
import splitByEverything from './split_by_everything';
import splitByTerms from './split_by_terms';
import dateHistogram from './date_histogram';
import metricBuckets from './metric_buckets';
import siblingBuckets from './sibling_buckets';
import filterRatios from './filter_ratios';

export default [
  query,
  pivot,
  splitByTerms,
  splitByEverything,
  dateHistogram,
  metricBuckets,
  siblingBuckets,
  filterRatios
];
