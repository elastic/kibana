/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FieldFormatsStartCommon } from '../../field_formats';

import * as buckets from './buckets';
import * as metrics from './metrics';

import { BUCKET_TYPES, CalculateBoundsFn } from './buckets';
import { METRIC_TYPES } from './metrics';

/** @internal */
export interface AggTypesDependencies {
  calculateBounds: CalculateBoundsFn;
  getConfig: <T = any>(key: string) => T;
  getFieldFormatsStart: () => Pick<FieldFormatsStartCommon, 'deserialize' | 'getDefaultInstance'>;
  isDefaultTimezone: () => boolean;
}

/** @internal */
export const getAggTypes = () => ({
  metrics: [
    { name: METRIC_TYPES.COUNT, fn: metrics.getCountMetricAgg },
    { name: METRIC_TYPES.AVG, fn: metrics.getAvgMetricAgg },
    { name: METRIC_TYPES.SUM, fn: metrics.getSumMetricAgg },
    { name: METRIC_TYPES.MEDIAN, fn: metrics.getMedianMetricAgg },
    { name: METRIC_TYPES.MIN, fn: metrics.getMinMetricAgg },
    { name: METRIC_TYPES.MAX, fn: metrics.getMaxMetricAgg },
    { name: METRIC_TYPES.STD_DEV, fn: metrics.getStdDeviationMetricAgg },
    { name: METRIC_TYPES.CARDINALITY, fn: metrics.getCardinalityMetricAgg },
    { name: METRIC_TYPES.PERCENTILES, fn: metrics.getPercentilesMetricAgg },
    { name: METRIC_TYPES.PERCENTILE_RANKS, fn: metrics.getPercentileRanksMetricAgg },
    { name: METRIC_TYPES.TOP_HITS, fn: metrics.getTopHitMetricAgg },
    { name: METRIC_TYPES.DERIVATIVE, fn: metrics.getDerivativeMetricAgg },
    { name: METRIC_TYPES.CUMULATIVE_SUM, fn: metrics.getCumulativeSumMetricAgg },
    { name: METRIC_TYPES.MOVING_FN, fn: metrics.getMovingAvgMetricAgg },
    { name: METRIC_TYPES.SERIAL_DIFF, fn: metrics.getSerialDiffMetricAgg },
    { name: METRIC_TYPES.AVG_BUCKET, fn: metrics.getBucketAvgMetricAgg },
    { name: METRIC_TYPES.SUM_BUCKET, fn: metrics.getBucketSumMetricAgg },
    { name: METRIC_TYPES.MIN_BUCKET, fn: metrics.getBucketMinMetricAgg },
    { name: METRIC_TYPES.MAX_BUCKET, fn: metrics.getBucketMaxMetricAgg },
    { name: METRIC_TYPES.GEO_BOUNDS, fn: metrics.getGeoBoundsMetricAgg },
    { name: METRIC_TYPES.GEO_CENTROID, fn: metrics.getGeoCentroidMetricAgg },
  ],
  buckets: [
    { name: BUCKET_TYPES.DATE_HISTOGRAM, fn: buckets.getDateHistogramBucketAgg },
    { name: BUCKET_TYPES.HISTOGRAM, fn: buckets.getHistogramBucketAgg },
    { name: BUCKET_TYPES.RANGE, fn: buckets.getRangeBucketAgg },
    { name: BUCKET_TYPES.DATE_RANGE, fn: buckets.getDateRangeBucketAgg },
    { name: BUCKET_TYPES.IP_RANGE, fn: buckets.getIpRangeBucketAgg },
    { name: BUCKET_TYPES.TERMS, fn: buckets.getTermsBucketAgg },
    { name: BUCKET_TYPES.FILTER, fn: buckets.getFilterBucketAgg },
    { name: BUCKET_TYPES.FILTERS, fn: buckets.getFiltersBucketAgg },
    { name: BUCKET_TYPES.SIGNIFICANT_TERMS, fn: buckets.getSignificantTermsBucketAgg },
    { name: BUCKET_TYPES.GEOHASH_GRID, fn: buckets.getGeoHashBucketAgg },
    { name: BUCKET_TYPES.GEOTILE_GRID, fn: buckets.getGeoTitleBucketAgg },
  ],
});

/** @internal */
export const getAggTypesFunctions = () => [
  buckets.aggFilter,
  buckets.aggFilters,
  buckets.aggSignificantTerms,
  buckets.aggIpRange,
  buckets.aggDateRange,
  buckets.aggRange,
  buckets.aggGeoTile,
  buckets.aggGeoHash,
  buckets.aggHistogram,
  buckets.aggDateHistogram,
  buckets.aggTerms,
  metrics.aggAvg,
  metrics.aggBucketAvg,
  metrics.aggBucketMax,
  metrics.aggBucketMin,
  metrics.aggBucketSum,
  metrics.aggCardinality,
  metrics.aggCount,
  metrics.aggCumulativeSum,
  metrics.aggDerivative,
  metrics.aggGeoBounds,
  metrics.aggGeoCentroid,
  metrics.aggMax,
  metrics.aggMedian,
  metrics.aggMin,
  metrics.aggMovingAvg,
  metrics.aggPercentileRanks,
  metrics.aggPercentiles,
  metrics.aggSerialDiff,
  metrics.aggStdDeviation,
  metrics.aggSum,
  metrics.aggTopHit,
];
