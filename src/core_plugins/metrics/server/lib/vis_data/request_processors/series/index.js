import query from './query';
import splitByEverything from './split_by_everything';
import splitByFilter from './split_by_filter';
import splitByFilters from './split_by_filters';
import splitByTerms from './split_by_terms';
import dateHistogram from './date_histogram';
import metricBuckets from './metric_buckets';
import siblingBuckets from './sibling_buckets';
import filterRatios from './filter_ratios';

export default [
  query,
  splitByTerms,
  splitByFilter,
  splitByFilters,
  splitByEverything,
  dateHistogram,
  metricBuckets,
  siblingBuckets,
  filterRatios
];
