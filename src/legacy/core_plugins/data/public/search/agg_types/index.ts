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
import { geoTileBucketAgg } from './buckets/geo_tile';
import { bucketSumMetricAgg } from './metrics/bucket_sum';
import { bucketAvgMetricAgg } from './metrics/bucket_avg';
import { bucketMinMetricAgg } from './metrics/bucket_min';
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

export { AggType } from './agg_type';
export { AggConfig } from './agg_config';
export { AggConfigs } from './agg_configs';
export { FieldParamType } from './param_types';
export { aggTypeFieldFilters } from './param_types/filter';
export { setBounds } from './buckets/date_histogram';
export { parentPipelineAggHelper } from './metrics/lib/parent_pipeline_agg_helper';

// static code
export { AggParamType } from './param_types/agg';
export { intervalOptions } from './buckets/_interval_options'; // only used in Discover
export { isDateHistogramBucketAggConfig } from './buckets/date_histogram';
export { isType, isStringType } from './buckets/migrate_include_exclude_format';
export { CidrMask } from './buckets/lib/cidr_mask';
export { convertDateRangeToString } from './buckets/date_range';
export { convertIPRangeToString } from './buckets/ip_range';
export { aggTypeFilters, propFilter } from './filter';
export { OptionedParamType } from './param_types/optioned';
export { isValidJson, isValidInterval } from './utils';
