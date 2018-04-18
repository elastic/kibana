import 'ui/directives/validate_agg';
import 'ui/agg_types/agg_params';
import { IndexedArray } from 'ui/indexed_array';
import { countMetricAgg } from 'ui/agg_types/metrics/count';
import { avgMetricAgg } from 'ui/agg_types/metrics/avg';
import { sumMetricAgg } from 'ui/agg_types/metrics/sum';
import { medianMetricAgg } from 'ui/agg_types/metrics/median';
import { minMetricAgg } from 'ui/agg_types/metrics/min';
import { maxMetricAgg } from 'ui/agg_types/metrics/max';
import { topHitMetricAgg } from 'ui/agg_types/metrics/top_hit';
import { stdDeviationMetricAgg } from 'ui/agg_types/metrics/std_deviation';
import { cardinalityMetricAgg } from 'ui/agg_types/metrics/cardinality';
import { percentilesMetricAgg } from 'ui/agg_types/metrics/percentiles';
import { geoBoundsMetricAgg } from 'ui/agg_types/metrics/geo_bounds';
import { geoCentroidMetricAgg } from 'ui/agg_types/metrics/geo_centroid';
import { percentileRanksMetricAgg } from 'ui/agg_types/metrics/percentile_ranks';
import { derivativeMetricAgg } from 'ui/agg_types/metrics/derivative';
import { cumulativeSumMetricAgg } from 'ui/agg_types/metrics/cumulative_sum';
import { movingAvgMetricAgg } from 'ui/agg_types/metrics/moving_avg';
import { serialDiffMetricAgg } from 'ui/agg_types/metrics/serial_diff';
import { dateHistogramBucketAgg } from 'ui/agg_types/buckets/date_histogram';
import { histogramBucketAgg } from 'ui/agg_types/buckets/histogram';
import { rangeBucketAgg } from 'ui/agg_types/buckets/range';
import { dateRangeBucketAgg } from 'ui/agg_types/buckets/date_range';
import { ipRangeBucketAgg } from 'ui/agg_types/buckets/ip_range';
import { termsBucketAgg } from 'ui/agg_types/buckets/terms';
import { filterBucketAgg } from 'ui/agg_types/buckets/filter';
import { filtersBucketAgg } from 'ui/agg_types/buckets/filters';
import { significantTermsBucketAgg } from 'ui/agg_types/buckets/significant_terms';
import { geoHashBucketAgg } from 'ui/agg_types/buckets/geo_hash';
import { bucketSumMetricAgg } from 'ui/agg_types/metrics/bucket_sum';
import { bucketAvgMetricAgg } from 'ui/agg_types/metrics/bucket_avg';
import { bucketMinMetricAgg } from 'ui/agg_types/metrics/bucket_min';
import { bucketMaxMetricAgg } from 'ui/agg_types/metrics/bucket_max';

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
