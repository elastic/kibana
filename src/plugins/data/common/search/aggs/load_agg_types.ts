/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AggTypesDependencies } from './agg_types';

import * as buckets from './buckets';
import * as metrics from './metrics/fns';

import { BUCKET_TYPES } from './buckets';
import type { MetricAggType } from './metrics';

import { METRIC_TYPES } from './metrics/metric_agg_types';

export interface AggTypeMetricLoader {
  name: METRIC_TYPES;
  fn: (deps: AggTypesDependencies) => () => Promise<MetricAggType<any>>;
}

/** @internal */
export const getAggTypeLoaders = (): { metrics: AggTypeMetricLoader[] } => ({
  metrics: [
    {
      name: METRIC_TYPES.COUNT,
      fn: (deps) => () => import('./metrics').then((m) => m.getCountMetricAgg()),
    },
    {
      name: METRIC_TYPES.AVG,
      fn: (deps) => () => import('./metrics').then((m) => m.getAvgMetricAgg()),
    },
    {
      name: METRIC_TYPES.SUM,
      fn: (deps) => () => import('./metrics').then((m) => m.getSumMetricAgg()),
    },
    {
      name: METRIC_TYPES.MEDIAN,
      fn: (deps) => () => import('./metrics').then((m) => m.getMedianMetricAgg()),
    },
    {
      name: METRIC_TYPES.SINGLE_PERCENTILE,
      fn: (deps) => () => import('./metrics').then((m) => m.getSinglePercentileMetricAgg()),
    },
    {
      name: METRIC_TYPES.MIN,
      fn: (deps) => () => import('./metrics').then((m) => m.getMinMetricAgg()),
    },
    {
      name: METRIC_TYPES.MAX,
      fn: (deps) => () => import('./metrics').then((m) => m.getMaxMetricAgg()),
    },
    {
      name: METRIC_TYPES.STD_DEV,
      fn: (deps) => () => import('./metrics').then((m) => m.getStdDeviationMetricAgg()),
    },
    {
      name: METRIC_TYPES.CARDINALITY,
      fn: (deps) => () => import('./metrics').then((m) => m.getCardinalityMetricAgg()),
    },
    {
      name: METRIC_TYPES.PERCENTILES,
      fn: (deps) => () => import('./metrics').then((m) => m.getPercentilesMetricAgg()),
    },
    {
      name: METRIC_TYPES.PERCENTILE_RANKS,
      fn: (deps) => () => import('./metrics').then((m) => m.getPercentileRanksMetricAgg(deps)),
    },
    {
      name: METRIC_TYPES.TOP_HITS,
      fn: (deps) => () => import('./metrics').then((m) => m.getTopHitMetricAgg()),
    },
    {
      name: METRIC_TYPES.DERIVATIVE,
      fn: (deps) => () => import('./metrics').then((m) => m.getDerivativeMetricAgg()),
    },

    {
      name: METRIC_TYPES.CUMULATIVE_SUM,
      fn: (deps) => () => import('./metrics').then((m) => m.getCumulativeSumMetricAgg()),
    },
    {
      name: METRIC_TYPES.MOVING_FN,
      fn: (deps) => () => import('./metrics').then((m) => m.getMovingAvgMetricAgg()),
    },
    {
      name: METRIC_TYPES.SERIAL_DIFF,
      fn: (deps) => () => import('./metrics').then((m) => m.getSerialDiffMetricAgg()),
    },
    {
      name: METRIC_TYPES.AVG_BUCKET,
      fn: (deps) => () => import('./metrics').then((m) => m.getBucketAvgMetricAgg()),
    },
    {
      name: METRIC_TYPES.SUM_BUCKET,
      fn: (deps) => () => import('./metrics').then((m) => m.getBucketSumMetricAgg()),
    },
    {
      name: METRIC_TYPES.MIN_BUCKET,
      fn: (deps) => () => import('./metrics').then((m) => m.getBucketMinMetricAgg()),
    },
    {
      name: METRIC_TYPES.MAX_BUCKET,
      fn: (deps) => () => import('./metrics').then((m) => m.getBucketMaxMetricAgg()),
    },
    {
      name: METRIC_TYPES.FILTERED_METRIC,
      fn: (deps) => () => import('./metrics').then((m) => m.getFilteredMetricAgg()),
    },

    {
      name: METRIC_TYPES.GEO_BOUNDS,
      fn: (deps) => () => import('./metrics').then((m) => m.getGeoBoundsMetricAgg()),
    },

    {
      name: METRIC_TYPES.GEO_CENTROID,
      fn: (deps) => () => import('./metrics').then((m) => m.getGeoCentroidMetricAgg()),
    },
  ],
});

/** @internal */
export const getAggTypes = () => ({
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
  metrics.aggFilteredMetric,
  metrics.aggCardinality,
  metrics.aggCount,
  metrics.aggCumulativeSum,
  metrics.aggDerivative,
  metrics.aggGeoBounds,
  metrics.aggGeoCentroid,
  metrics.aggMax,
  metrics.aggMedian,
  metrics.aggSinglePercentile,
  metrics.aggMin,
  metrics.aggMovingAvg,
  metrics.aggPercentileRanks,
  metrics.aggPercentiles,
  metrics.aggSerialDiff,
  metrics.aggStdDeviation,
  metrics.aggSum,
  metrics.aggTopHit,
];
