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

// @ts-ignore
import { AggType } from './agg_type';
// @ts-ignore
import { countMetricAgg } from './metrics/count';
// @ts-ignore
import { avgMetricAgg } from './metrics/avg';
// @ts-ignore
import { sumMetricAgg } from './metrics/sum';
// @ts-ignore
import { medianMetricAgg } from './metrics/median';
// @ts-ignore
import { minMetricAgg } from './metrics/min';
// @ts-ignore
import { maxMetricAgg } from './metrics/max';
// @ts-ignore
import { topHitMetricAgg } from './metrics/top_hit';
// @ts-ignore
import { stdDeviationMetricAgg } from './metrics/std_deviation';
// @ts-ignore
import { cardinalityMetricAgg } from './metrics/cardinality';
// @ts-ignore
import { percentilesMetricAgg } from './metrics/percentiles';
// @ts-ignore
import { geoBoundsMetricAgg } from './metrics/geo_bounds';
// @ts-ignore
import { geoCentroidMetricAgg } from './metrics/geo_centroid';
// @ts-ignore
import { percentileRanksMetricAgg } from './metrics/percentile_ranks';
// @ts-ignore
import { derivativeMetricAgg } from './metrics/derivative';
// @ts-ignore
import { cumulativeSumMetricAgg } from './metrics/cumulative_sum';
// @ts-ignore
import { movingAvgMetricAgg } from './metrics/moving_avg';
// @ts-ignore
import { serialDiffMetricAgg } from './metrics/serial_diff';
// @ts-ignore
import { dateHistogramBucketAgg, setBounds } from './buckets/date_histogram';
// @ts-ignore
import { histogramBucketAgg } from './buckets/histogram';
// @ts-ignore
import { rangeBucketAgg } from './buckets/range';
// @ts-ignore
import { dateRangeBucketAgg } from './buckets/date_range';
// @ts-ignore
import { ipRangeBucketAgg } from './buckets/ip_range';
// @ts-ignore
import { termsBucketAgg } from './buckets/terms';
// @ts-ignore
import { filterBucketAgg } from './buckets/filter';
// @ts-ignore
import { filtersBucketAgg } from './buckets/filters';
// @ts-ignore
import { significantTermsBucketAgg } from './buckets/significant_terms';
// @ts-ignore
import { geoHashBucketAgg } from './buckets/geo_hash';
// @ts-ignore
import { geoTileBucketAgg } from './buckets/geo_tile';
// @ts-ignore
import { bucketSumMetricAgg } from './metrics/bucket_sum';
// @ts-ignore
import { bucketAvgMetricAgg } from './metrics/bucket_avg';
// @ts-ignore
import { bucketMinMetricAgg } from './metrics/bucket_min';
// @ts-ignore
import { bucketMaxMetricAgg } from './metrics/bucket_max';

export const aggTypes = {
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
    geoCentroidMetricAgg,
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
    geoHashBucketAgg,
    geoTileBucketAgg,
  ],
};

aggTypes.metrics.forEach(aggType => (aggType.type = 'metrics'));
aggTypes.buckets.forEach(aggType => (aggType.type = 'buckets'));

export { AggParam } from './agg_params';
export { AggType } from './agg_type';
export { FieldParamType } from './param_types';
export { BucketAggType } from './buckets/_bucket_agg_type';
export { setBounds };
