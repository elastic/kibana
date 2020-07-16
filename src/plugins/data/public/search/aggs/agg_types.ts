/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { IUiSettingsClient } from 'src/core/public';
import { TimeRange, TimeRangeBounds } from '../../../common';
import { GetInternalStartServicesFn } from '../../types';

import { getCountMetricAgg } from './metrics/count';
import { getAvgMetricAgg } from './metrics/avg';
import { getSumMetricAgg } from './metrics/sum';
import { getMedianMetricAgg } from './metrics/median';
import { getMinMetricAgg } from './metrics/min';
import { getMaxMetricAgg } from './metrics/max';
import { getTopHitMetricAgg } from './metrics/top_hit';
import { getStdDeviationMetricAgg } from './metrics/std_deviation';
import { getCardinalityMetricAgg } from './metrics/cardinality';
import { getPercentilesMetricAgg } from './metrics/percentiles';
import { getGeoBoundsMetricAgg } from './metrics/geo_bounds';
import { getGeoCentroidMetricAgg } from './metrics/geo_centroid';
import { getPercentileRanksMetricAgg } from './metrics/percentile_ranks';
import { getDerivativeMetricAgg } from './metrics/derivative';
import { getCumulativeSumMetricAgg } from './metrics/cumulative_sum';
import { getMovingAvgMetricAgg } from './metrics/moving_avg';
import { getSerialDiffMetricAgg } from './metrics/serial_diff';

import { getDateHistogramBucketAgg } from './buckets/date_histogram';
import { getHistogramBucketAgg } from './buckets/histogram';
import { getRangeBucketAgg } from './buckets/range';
import { getDateRangeBucketAgg } from './buckets/date_range';
import { getIpRangeBucketAgg } from './buckets/ip_range';
import { getTermsBucketAgg } from './buckets/terms';
import { getFilterBucketAgg } from './buckets/filter';
import { getFiltersBucketAgg } from './buckets/filters';
import { getSignificantTermsBucketAgg } from './buckets/significant_terms';
import { getGeoHashBucketAgg } from './buckets/geo_hash';
import { getGeoTitleBucketAgg } from './buckets/geo_tile';
import { getBucketSumMetricAgg } from './metrics/bucket_sum';
import { getBucketAvgMetricAgg } from './metrics/bucket_avg';
import { getBucketMinMetricAgg } from './metrics/bucket_min';
import { getBucketMaxMetricAgg } from './metrics/bucket_max';

export interface AggTypesDependencies {
  calculateBounds: (timeRange: TimeRange) => TimeRangeBounds;
  getInternalStartServices: GetInternalStartServicesFn;
  uiSettings: IUiSettingsClient;
}

export const getAggTypes = ({
  calculateBounds,
  getInternalStartServices,
  uiSettings,
}: AggTypesDependencies) => ({
  metrics: [
    getCountMetricAgg(),
    getAvgMetricAgg(),
    getSumMetricAgg(),
    getMedianMetricAgg(),
    getMinMetricAgg(),
    getMaxMetricAgg(),
    getStdDeviationMetricAgg(),
    getCardinalityMetricAgg(),
    getPercentilesMetricAgg(),
    getPercentileRanksMetricAgg({ getInternalStartServices }),
    getTopHitMetricAgg(),
    getDerivativeMetricAgg(),
    getCumulativeSumMetricAgg(),
    getMovingAvgMetricAgg(),
    getSerialDiffMetricAgg(),
    getBucketAvgMetricAgg(),
    getBucketSumMetricAgg(),
    getBucketMinMetricAgg(),
    getBucketMaxMetricAgg(),
    getGeoBoundsMetricAgg(),
    getGeoCentroidMetricAgg(),
  ],
  buckets: [
    getDateHistogramBucketAgg({ calculateBounds, uiSettings }),
    getHistogramBucketAgg({ uiSettings, getInternalStartServices }),
    getRangeBucketAgg({ getInternalStartServices }),
    getDateRangeBucketAgg({ uiSettings }),
    getIpRangeBucketAgg(),
    getTermsBucketAgg(),
    getFilterBucketAgg(),
    getFiltersBucketAgg({ uiSettings }),
    getSignificantTermsBucketAgg(),
    getGeoHashBucketAgg(),
    getGeoTitleBucketAgg(),
  ],
});

/** Buckets: **/
import { aggFilter } from './buckets/filter_fn';
import { aggFilters } from './buckets/filters_fn';
import { aggSignificantTerms } from './buckets/significant_terms_fn';
import { aggIpRange } from './buckets/ip_range_fn';
import { aggDateRange } from './buckets/date_range_fn';
import { aggRange } from './buckets/range_fn';
import { aggGeoTile } from './buckets/geo_tile_fn';
import { aggGeoHash } from './buckets/geo_hash_fn';
import { aggHistogram } from './buckets/histogram_fn';
import { aggDateHistogram } from './buckets/date_histogram_fn';
import { aggTerms } from './buckets/terms_fn';

/** Metrics: **/
import { aggAvg } from './metrics/avg_fn';
import { aggBucketAvg } from './metrics/bucket_avg_fn';
import { aggBucketMax } from './metrics/bucket_max_fn';
import { aggBucketMin } from './metrics/bucket_min_fn';
import { aggBucketSum } from './metrics/bucket_sum_fn';
import { aggCardinality } from './metrics/cardinality_fn';
import { aggCount } from './metrics/count_fn';
import { aggCumulativeSum } from './metrics/cumulative_sum_fn';
import { aggDerivative } from './metrics/derivative_fn';
import { aggGeoBounds } from './metrics/geo_bounds_fn';
import { aggGeoCentroid } from './metrics/geo_centroid_fn';
import { aggMax } from './metrics/max_fn';
import { aggMedian } from './metrics/median_fn';
import { aggMin } from './metrics/min_fn';
import { aggMovingAvg } from './metrics/moving_avg_fn';
import { aggPercentileRanks } from './metrics/percentile_ranks_fn';
import { aggPercentiles } from './metrics/percentiles_fn';
import { aggSerialDiff } from './metrics/serial_diff_fn';
import { aggStdDeviation } from './metrics/std_deviation_fn';
import { aggSum } from './metrics/sum_fn';
import { aggTopHit } from './metrics/top_hit_fn';

export const getAggTypesFunctions = () => [
  aggAvg,
  aggBucketAvg,
  aggBucketMax,
  aggBucketMin,
  aggBucketSum,
  aggCardinality,
  aggCount,
  aggCumulativeSum,
  aggDerivative,
  aggGeoBounds,
  aggGeoCentroid,
  aggMax,
  aggMedian,
  aggMin,
  aggMovingAvg,
  aggPercentileRanks,
  aggPercentiles,
  aggSerialDiff,
  aggStdDeviation,
  aggSum,
  aggTopHit,
  aggFilter,
  aggFilters,
  aggSignificantTerms,
  aggIpRange,
  aggDateRange,
  aggRange,
  aggGeoTile,
  aggGeoHash,
  aggDateHistogram,
  aggHistogram,
  aggTerms,
];
