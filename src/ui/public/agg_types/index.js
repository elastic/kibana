import { IndexedArray } from 'ui/indexed_array';
import 'ui/agg_types/agg_params';
import { AggTypesMetricsCountProvider } from 'ui/agg_types/metrics/count';
import { AggTypesMetricsAvgProvider } from 'ui/agg_types/metrics/avg';
import { AggTypesMetricsSumProvider } from 'ui/agg_types/metrics/sum';
import { AggTypesMetricsMedianProvider } from 'ui/agg_types/metrics/median';
import { AggTypesMetricsMinProvider } from 'ui/agg_types/metrics/min';
import { AggTypesMetricsMaxProvider } from 'ui/agg_types/metrics/max';
import { AggTypesMetricsTopHitProvider } from 'ui/agg_types/metrics/top_hit';
import { AggTypesMetricsStdDeviationProvider } from 'ui/agg_types/metrics/std_deviation';
import { AggTypesMetricsCardinalityProvider } from 'ui/agg_types/metrics/cardinality';
import { AggTypesMetricsPercentilesProvider } from 'ui/agg_types/metrics/percentiles';
import { AggTypesMetricsGeoCentroidProvider } from 'ui/agg_types/metrics/geo_centroid';
import { AggTypesMetricsPercentileRanksProvider } from 'ui/agg_types/metrics/percentile_ranks';
import { AggTypesMetricsDerivativeProvider } from 'ui/agg_types/metrics/derivative';
import { AggTypesMetricsCumulativeSumProvider } from 'ui/agg_types/metrics/cumulative_sum';
import { AggTypesMetricsMovingAvgProvider } from 'ui/agg_types/metrics/moving_avg';
import { AggTypesMetricsSerialDiffProvider } from 'ui/agg_types/metrics/serial_diff';
import { AggTypesBucketsDateHistogramProvider } from 'ui/agg_types/buckets/date_histogram';
import { AggTypesBucketsHistogramProvider } from 'ui/agg_types/buckets/histogram';
import { AggTypesBucketsRangeProvider } from 'ui/agg_types/buckets/range';
import { AggTypesBucketsDateRangeProvider } from 'ui/agg_types/buckets/date_range';
import { AggTypesBucketsIpRangeProvider } from 'ui/agg_types/buckets/ip_range';
import { AggTypesBucketsTermsProvider } from 'ui/agg_types/buckets/terms';
import { AggTypesBucketsFiltersProvider } from 'ui/agg_types/buckets/filters';
import { AggTypesBucketsSignificantTermsProvider } from 'ui/agg_types/buckets/significant_terms';
import { AggTypesBucketsGeoHashProvider } from 'ui/agg_types/buckets/geo_hash';
import { AggTypesMetricsBucketSumProvider } from 'ui/agg_types/metrics/bucket_sum';
import { AggTypesMetricsBucketAvgProvider } from 'ui/agg_types/metrics/bucket_avg';
import { AggTypesMetricsBucketMinProvider } from 'ui/agg_types/metrics/bucket_min';
import { AggTypesMetricsBucketMaxProvider } from 'ui/agg_types/metrics/bucket_max';
import 'ui/directives/validate_agg';

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
      Private(AggTypesMetricsGeoCentroidProvider)
    ],
    buckets: [
      Private(AggTypesBucketsDateHistogramProvider),
      Private(AggTypesBucketsHistogramProvider),
      Private(AggTypesBucketsRangeProvider),
      Private(AggTypesBucketsDateRangeProvider),
      Private(AggTypesBucketsIpRangeProvider),
      Private(AggTypesBucketsTermsProvider),
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
