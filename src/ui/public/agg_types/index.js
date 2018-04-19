import { IndexedArray } from '../indexed_array';
import './agg_params';
import { AggTypesMetricsCountProvider } from './metrics/count';
import { AggTypesMetricsAvgProvider } from './metrics/avg';
import { AggTypesMetricsSumProvider } from './metrics/sum';
import { AggTypesMetricsMedianProvider } from './metrics/median';
import { AggTypesMetricsMinProvider } from './metrics/min';
import { AggTypesMetricsMaxProvider } from './metrics/max';
import { AggTypesMetricsTopHitProvider } from './metrics/top_hit';
import { AggTypesMetricsStdDeviationProvider } from './metrics/std_deviation';
import { AggTypesMetricsCardinalityProvider } from './metrics/cardinality';
import { AggTypesMetricsPercentilesProvider } from './metrics/percentiles';
import { AggTypesMetricsGeoBoundsProvider } from './metrics/geo_bounds';
import { AggTypesMetricsGeoCentroidProvider } from './metrics/geo_centroid';
import { AggTypesMetricsPercentileRanksProvider } from './metrics/percentile_ranks';
import { AggTypesMetricsDerivativeProvider } from './metrics/derivative';
import { AggTypesMetricsCumulativeSumProvider } from './metrics/cumulative_sum';
import { AggTypesMetricsMovingAvgProvider } from './metrics/moving_avg';
import { AggTypesMetricsSerialDiffProvider } from './metrics/serial_diff';
import { AggTypesBucketsDateHistogramProvider } from './buckets/date_histogram';
import { AggTypesBucketsHistogramProvider } from './buckets/histogram';
import { AggTypesBucketsRangeProvider } from './buckets/range';
import { AggTypesBucketsDateRangeProvider } from './buckets/date_range';
import { AggTypesBucketsIpRangeProvider } from './buckets/ip_range';
import { AggTypesBucketsTermsProvider } from './buckets/terms';
import { AggTypesBucketsFilterProvider } from './buckets/filter';
import { AggTypesBucketsFiltersProvider } from './buckets/filters';
import { AggTypesBucketsSignificantTermsProvider } from './buckets/significant_terms';
import { AggTypesBucketsGeoHashProvider } from './buckets/geo_hash';
import { AggTypesMetricsBucketSumProvider } from './metrics/bucket_sum';
import { AggTypesMetricsBucketAvgProvider } from './metrics/bucket_avg';
import { AggTypesMetricsBucketMinProvider } from './metrics/bucket_min';
import { AggTypesMetricsBucketMaxProvider } from './metrics/bucket_max';
import '../directives/validate_agg';

export function AggTypesIndexProvider(Private) {

  const aggs = {
    metrics: [
      Private(AggTypesMetricsCountProvider),
      Private(AggTypesMetricsAvgProvider),
      Private(AggTypesMetricsSumProvider),
      Private(AggTypesMetricsMedianProvider),
      Private(AggTypesMetricsMinProvider),
      Private(AggTypesMetricsMaxProvider),
      Private(AggTypesMetricsStdDeviationProvider),
      Private(AggTypesMetricsCardinalityProvider),
      Private(AggTypesMetricsPercentilesProvider),
      Private(AggTypesMetricsPercentileRanksProvider),
      Private(AggTypesMetricsTopHitProvider),
      Private(AggTypesMetricsDerivativeProvider),
      Private(AggTypesMetricsCumulativeSumProvider),
      Private(AggTypesMetricsMovingAvgProvider),
      Private(AggTypesMetricsSerialDiffProvider),
      Private(AggTypesMetricsBucketAvgProvider),
      Private(AggTypesMetricsBucketSumProvider),
      Private(AggTypesMetricsBucketMinProvider),
      Private(AggTypesMetricsBucketMaxProvider),
      Private(AggTypesMetricsGeoBoundsProvider),
      Private(AggTypesMetricsGeoCentroidProvider)
    ],
    buckets: [
      Private(AggTypesBucketsDateHistogramProvider),
      Private(AggTypesBucketsHistogramProvider),
      Private(AggTypesBucketsRangeProvider),
      Private(AggTypesBucketsDateRangeProvider),
      Private(AggTypesBucketsIpRangeProvider),
      Private(AggTypesBucketsTermsProvider),
      Private(AggTypesBucketsFilterProvider),
      Private(AggTypesBucketsFiltersProvider),
      Private(AggTypesBucketsSignificantTermsProvider),
      Private(AggTypesBucketsGeoHashProvider),
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
  return new IndexedArray({

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
}
