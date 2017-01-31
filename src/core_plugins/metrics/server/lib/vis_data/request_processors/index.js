import query from './query';
import splitByEverything from './split_by_everything';
import splitByFilter from './split_by_filter';
import splitByTerms from './split_by_terms';
import dateHistogram from './date_histogram';
import metricBuckets from './metric_buckets';
import siblingBuckets from './sibling_buckets';

export default [
  query,
  splitByTerms,
  splitByFilter,
  splitByEverything,
  dateHistogram,
  metricBuckets,
  siblingBuckets
];
