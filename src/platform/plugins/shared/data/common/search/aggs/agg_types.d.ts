/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import type * as buckets from './buckets';
import type { CalculateBoundsFn } from './buckets';
import type { BUCKET_TYPES } from './buckets';
import type * as metrics from './metrics';
import type { METRIC_TYPES } from './metrics';
export interface AggTypesDependencies {
  calculateBounds: CalculateBoundsFn;
  getConfig: <T = any>(key: string) => T;
  getFieldFormatsStart: () => Pick<FieldFormatsStartCommon, 'deserialize' | 'getDefaultInstance'>;
  aggExecutionContext?: {
    shouldDetectTimeZone?: boolean;
  };
}
/** @internal */
export declare const getAggTypes: () => {
  metrics: (
    | {
        name: METRIC_TYPES;
        fn: typeof metrics.getStdDeviationMetricAgg;
      }
    | {
        name: METRIC_TYPES;
        fn: typeof metrics.getPercentileRanksMetricAgg;
      }
    | {
        name: METRIC_TYPES;
        fn: typeof metrics.getTopHitMetricAgg;
      }
    | {
        name: METRIC_TYPES;
        fn: typeof metrics.getFilteredMetricAgg;
      }
  )[];
  buckets: (
    | {
        name: BUCKET_TYPES;
        fn: typeof buckets.getDateHistogramBucketAgg;
      }
    | {
        name: BUCKET_TYPES;
        fn: typeof buckets.getHistogramBucketAgg;
      }
    | {
        name: BUCKET_TYPES;
        fn: typeof buckets.getDateRangeBucketAgg;
      }
    | {
        name: BUCKET_TYPES;
        fn: typeof buckets.getGeoTitleBucketAgg;
      }
  )[];
};
/** @internal */
export declare const getAggTypesFunctions: () => (
  | typeof buckets.aggDateHistogram
  | typeof buckets.aggTimeSeries
  | typeof buckets.aggSampler
  | typeof buckets.aggDiversifiedSampler
  | typeof buckets.aggSignificantText
  | typeof metrics.aggTopMetrics
  | typeof buckets.aggDateRange
  | typeof buckets.aggFilter
  | typeof buckets.aggFilters
  | typeof buckets.aggGeoTile
  | typeof buckets.aggHistogram
  | typeof buckets.aggIpPrefix
  | typeof buckets.aggIpRange
  | typeof buckets.aggRange
  | typeof buckets.aggSignificantTerms
  | typeof buckets.aggTerms
  | typeof buckets.aggMultiTerms
  | typeof buckets.aggRareTerms
  | typeof metrics.aggAvg
  | typeof metrics.aggBucketAvg
  | typeof metrics.aggBucketMax
  | typeof metrics.aggBucketMin
  | typeof metrics.aggBucketSum
  | typeof metrics.aggFilteredMetric
  | typeof metrics.aggCardinality
  | typeof metrics.aggValueCount
  | typeof metrics.aggCount
  | typeof metrics.aggCumulativeSum
  | typeof metrics.aggDerivative
  | typeof metrics.aggGeoBounds
  | typeof metrics.aggGeoCentroid
  | typeof metrics.aggMax
  | typeof metrics.aggMedian
  | typeof metrics.aggSinglePercentile
  | typeof metrics.aggMin
  | typeof metrics.aggMovingAvg
  | typeof metrics.aggPercentileRanks
  | typeof metrics.aggPercentiles
  | typeof metrics.aggRate
  | typeof metrics.aggSinglePercentileRank
  | typeof metrics.aggSerialDiff
  | typeof metrics.aggStdDeviation
  | typeof metrics.aggSum
  | typeof metrics.aggTopHit
)[];
