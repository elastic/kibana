import '../directives/validate_agg';
import './agg_params';
import { IndexedArray } from '../indexed_array';
import { countMetricAgg } from './metrics/count';
import { avgMetricAgg } from './metrics/avg';
import { sumMetricAgg } from './metrics/sum';
import { medianMetricAgg } from './metrics/median';
import { minMetricAgg } from './metrics/min';
import { maxMetricAgg } from './metrics/max';
import { topHitMetricAgg } from './metrics/top_hit';
import { stdDeviationMetricAgg } from './metrics/std_deviation';
import { cardinalityMetricAgg } from './metrics/cardinality';
import { percentilesMetricAgg } from './metrics/percentiles';
import { geoBoundsMetricAgg } from './metrics/geo_bounds';
import { geoCentroidMetricAgg } from './metrics/geo_centroid';
import { percentileRanksMetricAgg } from './metrics/percentile_ranks';
import { derivativeMetricAgg } from './metrics/derivative';
import { cumulativeSumMetricAgg } from './metrics/cumulative_sum';
import { movingAvgMetricAgg } from './metrics/moving_avg';
import { serialDiffMetricAgg } from './metrics/serial_diff';
import { dateHistogramBucketAgg } from './buckets/date_histogram';
import { histogramBucketAgg } from './buckets/histogram';
import { rangeBucketAgg } from './buckets/range';
import { dateRangeBucketAgg } from './buckets/date_range';
import { ipRangeBucketAgg } from './buckets/ip_range';
import { termsBucketAgg } from './buckets/terms';
import { filterBucketAgg } from './buckets/filter';
import { filtersBucketAgg } from './buckets/filters';
import { significantTermsBucketAgg } from './buckets/significant_terms';
import { geoHashBucketAgg } from './buckets/geo_hash';
import { bucketSumMetricAgg } from './metrics/bucket_sum';
import { bucketAvgMetricAgg } from './metrics/bucket_avg';
import { bucketMinMetricAgg } from './metrics/bucket_min';
import { bucketMaxMetricAgg } from './metrics/bucket_max';

const aggs = {
  metrics: [
    countMetricAgg,
    avgMetricAgg,
    sumMetricAgg,
    medianMetricAgg,
    minMetricAgg,
    maxMetricAgg,
    stdDeviationMetricAgg,
    cardinalityMetricAgg,
    percentilesMetricAgg,
    percentileRanksMetricAgg,
    topHitMetricAgg,
    derivativeMetricAgg,
    cumulativeSumMetricAgg,
    movingAvgMetricAgg,
    serialDiffMetricAgg,
    bucketAvgMetricAgg,
    bucketSumMetricAgg,
    bucketMinMetricAgg,
    bucketMaxMetricAgg,
    geoBoundsMetricAgg,
    geoCentroidMetricAgg
  ],
  buckets: [
    dateHistogramBucketAgg,
    histogramBucketAgg,
    rangeBucketAgg,
    dateRangeBucketAgg,
    ipRangeBucketAgg,
    termsBucketAgg,
    filterBucketAgg,
    filtersBucketAgg,
    significantTermsBucketAgg,
    geoHashBucketAgg
  ]
};

Object.keys(aggs).forEach(function (type) {
  aggs[type].forEach(function (agg) {
    agg.type = type;
  });
});


/**
 * IndexedArray of Aggregation Types.
 *
 * These types form two groups, metric and buckets.
 *
 * @module agg_types
 * @type {IndexedArray}
 */
export const aggTypes = new IndexedArray({

  /**
   * @type {Array}
   */
  index: ['name'],

  /**
   * [group description]
   * @type {Array}
   */
  group: ['type'],
  initialSet: aggs.metrics.concat(aggs.buckets)
});
