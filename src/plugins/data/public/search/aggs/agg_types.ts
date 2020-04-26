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
import { QuerySetup } from '../../query/query_service';

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

import { GetInternalStartServicesFn } from '../../types';

export interface AggTypesDependencies {
  uiSettings: IUiSettingsClient;
  query: QuerySetup;
  getInternalStartServices: GetInternalStartServicesFn;
}

export const getAggTypes = ({
  uiSettings,
  query,
  getInternalStartServices,
}: AggTypesDependencies) => ({
  metrics: [
    getCountMetricAgg({ getInternalStartServices }),
    getAvgMetricAgg({ getInternalStartServices }),
    getSumMetricAgg({ getInternalStartServices }),
    getMedianMetricAgg({ getInternalStartServices }),
    getMinMetricAgg({ getInternalStartServices }),
    getMaxMetricAgg({ getInternalStartServices }),
    getStdDeviationMetricAgg({ getInternalStartServices }),
    getCardinalityMetricAgg({ getInternalStartServices }),
    getPercentilesMetricAgg({ getInternalStartServices }),
    getPercentileRanksMetricAgg({ getInternalStartServices }),
    getTopHitMetricAgg({ getInternalStartServices }),
    getDerivativeMetricAgg({ getInternalStartServices }),
    getCumulativeSumMetricAgg({ getInternalStartServices }),
    getMovingAvgMetricAgg({ getInternalStartServices }),
    getSerialDiffMetricAgg({ getInternalStartServices }),
    getBucketAvgMetricAgg({ getInternalStartServices }),
    getBucketSumMetricAgg({ getInternalStartServices }),
    getBucketMinMetricAgg({ getInternalStartServices }),
    getBucketMaxMetricAgg({ getInternalStartServices }),
    getGeoBoundsMetricAgg({ getInternalStartServices }),
    getGeoCentroidMetricAgg({ getInternalStartServices }),
  ],
  buckets: [
    getDateHistogramBucketAgg({ uiSettings, query, getInternalStartServices }),
    getHistogramBucketAgg({ uiSettings, getInternalStartServices }),
    getRangeBucketAgg({ getInternalStartServices }),
    getDateRangeBucketAgg({ uiSettings, getInternalStartServices }),
    getIpRangeBucketAgg({ getInternalStartServices }),
    getTermsBucketAgg({ getInternalStartServices }),
    getFilterBucketAgg({ getInternalStartServices }),
    getFiltersBucketAgg({ uiSettings, getInternalStartServices }),
    getSignificantTermsBucketAgg({ getInternalStartServices }),
    getGeoHashBucketAgg({ getInternalStartServices }),
    getGeoTitleBucketAgg({ getInternalStartServices }),
  ],
});

import { aggTerms } from './buckets/terms_fn';

export const getAggTypesFunctions = () => [aggTerms];
