/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Assign } from '@kbn/utility-types';
import { AggParamsRandomSampler, IndexPattern } from '../..';
import {
  aggAvg,
  aggBucketAvg,
  aggBucketMax,
  aggBucketMin,
  aggBucketSum,
  aggCardinality,
  AggConfigs,
  AggConfigSerialized,
  aggCount,
  aggCumulativeSum,
  aggDateHistogram,
  aggDateRange,
  aggDerivative,
  aggFilter,
  aggFilters,
  aggGeoBounds,
  aggGeoCentroid,
  aggGeoHash,
  aggGeoTile,
  aggHistogram,
  aggIpRange,
  aggMax,
  aggMedian,
  aggMin,
  aggMovingAvg,
  AggParamsAvg,
  AggParamsBucketAvg,
  AggParamsBucketMax,
  AggParamsBucketMin,
  AggParamsBucketSum,
  AggParamsFilteredMetric,
  AggParamsCardinality,
  AggParamsCumulativeSum,
  AggParamsDateHistogram,
  AggParamsDateRange,
  AggParamsDerivative,
  AggParamsFilter,
  AggParamsFilters,
  AggParamsGeoBounds,
  AggParamsGeoCentroid,
  AggParamsGeoHash,
  AggParamsGeoTile,
  AggParamsHistogram,
  AggParamsIpRange,
  AggParamsMax,
  AggParamsMedian,
  AggParamsSinglePercentile,
  AggParamsMin,
  AggParamsMovingAvg,
  AggParamsPercentileRanks,
  AggParamsPercentiles,
  AggParamsRange,
  AggParamsSerialDiff,
  AggParamsSignificantTerms,
  AggParamsStdDeviation,
  AggParamsSum,
  AggParamsTerms,
  AggParamsMultiTerms,
  AggParamsRareTerms,
  AggParamsTopHit,
  aggPercentileRanks,
  aggPercentiles,
  aggRange,
  aggSerialDiff,
  aggSignificantTerms,
  aggStdDeviation,
  aggSum,
  aggTerms,
  aggMultiTerms,
  aggRareTerms,
  aggTopHit,
  AggTypesRegistry,
  AggTypesRegistrySetup,
  AggTypesRegistryStart,
  BUCKET_TYPES,
  CreateAggConfigParams,
  getCalculateAutoTimeExpression,
  METRIC_TYPES,
  aggFilteredMetric,
  aggSinglePercentile,
} from './';
import { AggParamsSampler } from './buckets/sampler';
import { AggParamsDiversifiedSampler } from './buckets/diversified_sampler';
import { AggParamsSignificantText } from './buckets/significant_text';
import { AggParamsTopMetrics } from './metrics/top_metrics';
import { aggTopMetrics } from './metrics/top_metrics_fn';
import { AggParamsCount } from './metrics';

export type { IAggConfig, AggConfigSerialized } from './agg_config';
export type { CreateAggConfigParams, IAggConfigs } from './agg_configs';
export type { IAggType } from './agg_type';
export type { AggParam, AggParamOption } from './agg_params';
export type { IFieldParamType } from './param_types';
export type { IMetricAggType } from './metrics/metric_agg_type';
export type { IpRangeKey } from './buckets/lib/ip_range';
export type { OptionedValueProp } from './param_types/optioned';

export interface AggsCommonSetup {
  types: AggTypesRegistrySetup;
}

export interface AggsCommonStart {
  calculateAutoTimeExpression: ReturnType<typeof getCalculateAutoTimeExpression>;
  createAggConfigs: (
    indexPattern: IndexPattern,
    configStates?: CreateAggConfigParams[]
  ) => InstanceType<typeof AggConfigs>;
  types: ReturnType<AggTypesRegistry['start']>;
}

/**
 * AggsStart represents the actual external contract as AggsCommonStart
 * is only used internally. The difference is that AggsStart includes the
 * typings for the registry with initialized agg types.
 *
 * @public
 */
export type AggsStart = Assign<AggsCommonStart, { types: AggTypesRegistryStart }>;

export interface BaseAggParams {
  json?: string;
  customLabel?: string;
  timeShift?: string;
}

export interface AggExpressionType {
  type: 'agg_type';
  value: AggConfigSerialized;
}

/** @internal */
export type AggExpressionFunctionArgs<Name extends keyof AggParamsMapping> =
  AggParamsMapping[Name] & Pick<AggConfigSerialized, 'id' | 'enabled' | 'schema'>;

/**
 * A global list of the param interfaces for each agg type.
 * For now this is internal, but eventually we will probably
 * want to make it public.
 *
 * @internal
 */
export interface AggParamsMapping {
  [BUCKET_TYPES.RANGE]: AggParamsRange;
  [BUCKET_TYPES.IP_RANGE]: AggParamsIpRange;
  [BUCKET_TYPES.DATE_RANGE]: AggParamsDateRange;
  [BUCKET_TYPES.FILTER]: AggParamsFilter;
  [BUCKET_TYPES.FILTERS]: AggParamsFilters;
  [BUCKET_TYPES.SIGNIFICANT_TERMS]: AggParamsSignificantTerms;
  [BUCKET_TYPES.SIGNIFICANT_TEXT]: AggParamsSignificantText;
  [BUCKET_TYPES.GEOTILE_GRID]: AggParamsGeoTile;
  [BUCKET_TYPES.GEOHASH_GRID]: AggParamsGeoHash;
  [BUCKET_TYPES.HISTOGRAM]: AggParamsHistogram;
  [BUCKET_TYPES.DATE_HISTOGRAM]: AggParamsDateHistogram;
  [BUCKET_TYPES.TERMS]: AggParamsTerms;
  [BUCKET_TYPES.MULTI_TERMS]: AggParamsMultiTerms;
  [BUCKET_TYPES.RARE_TERMS]: AggParamsRareTerms;
  [BUCKET_TYPES.SAMPLER]: AggParamsSampler;
  [BUCKET_TYPES.RANDOM_SAMPLER]: AggParamsRandomSampler;
  [BUCKET_TYPES.DIVERSIFIED_SAMPLER]: AggParamsDiversifiedSampler;
  [METRIC_TYPES.AVG]: AggParamsAvg;
  [METRIC_TYPES.CARDINALITY]: AggParamsCardinality;
  [METRIC_TYPES.COUNT]: AggParamsCount;
  [METRIC_TYPES.GEO_BOUNDS]: AggParamsGeoBounds;
  [METRIC_TYPES.GEO_CENTROID]: AggParamsGeoCentroid;
  [METRIC_TYPES.MAX]: AggParamsMax;
  [METRIC_TYPES.MEDIAN]: AggParamsMedian;
  [METRIC_TYPES.SINGLE_PERCENTILE]: AggParamsSinglePercentile;
  [METRIC_TYPES.MIN]: AggParamsMin;
  [METRIC_TYPES.STD_DEV]: AggParamsStdDeviation;
  [METRIC_TYPES.SUM]: AggParamsSum;
  [METRIC_TYPES.AVG_BUCKET]: AggParamsBucketAvg;
  [METRIC_TYPES.MAX_BUCKET]: AggParamsBucketMax;
  [METRIC_TYPES.MIN_BUCKET]: AggParamsBucketMin;
  [METRIC_TYPES.SUM_BUCKET]: AggParamsBucketSum;
  [METRIC_TYPES.FILTERED_METRIC]: AggParamsFilteredMetric;
  [METRIC_TYPES.CUMULATIVE_SUM]: AggParamsCumulativeSum;
  [METRIC_TYPES.DERIVATIVE]: AggParamsDerivative;
  [METRIC_TYPES.MOVING_FN]: AggParamsMovingAvg;
  [METRIC_TYPES.PERCENTILE_RANKS]: AggParamsPercentileRanks;
  [METRIC_TYPES.PERCENTILES]: AggParamsPercentiles;
  [METRIC_TYPES.SERIAL_DIFF]: AggParamsSerialDiff;
  [METRIC_TYPES.TOP_HITS]: AggParamsTopHit;
  [METRIC_TYPES.TOP_METRICS]: AggParamsTopMetrics;
}

/**
 * A global list of the expression function definitions for each agg type function.
 */
export interface AggFunctionsMapping {
  aggFilter: ReturnType<typeof aggFilter>;
  aggFilters: ReturnType<typeof aggFilters>;
  aggSignificantTerms: ReturnType<typeof aggSignificantTerms>;
  aggIpRange: ReturnType<typeof aggIpRange>;
  aggDateRange: ReturnType<typeof aggDateRange>;
  aggRange: ReturnType<typeof aggRange>;
  aggGeoTile: ReturnType<typeof aggGeoTile>;
  aggGeoHash: ReturnType<typeof aggGeoHash>;
  aggHistogram: ReturnType<typeof aggHistogram>;
  aggDateHistogram: ReturnType<typeof aggDateHistogram>;
  aggTerms: ReturnType<typeof aggTerms>;
  aggMultiTerms: ReturnType<typeof aggMultiTerms>;
  aggRareTerms: ReturnType<typeof aggRareTerms>;
  aggAvg: ReturnType<typeof aggAvg>;
  aggBucketAvg: ReturnType<typeof aggBucketAvg>;
  aggBucketMax: ReturnType<typeof aggBucketMax>;
  aggBucketMin: ReturnType<typeof aggBucketMin>;
  aggBucketSum: ReturnType<typeof aggBucketSum>;
  aggFilteredMetric: ReturnType<typeof aggFilteredMetric>;
  aggCardinality: ReturnType<typeof aggCardinality>;
  aggCount: ReturnType<typeof aggCount>;
  aggCumulativeSum: ReturnType<typeof aggCumulativeSum>;
  aggDerivative: ReturnType<typeof aggDerivative>;
  aggGeoBounds: ReturnType<typeof aggGeoBounds>;
  aggGeoCentroid: ReturnType<typeof aggGeoCentroid>;
  aggMax: ReturnType<typeof aggMax>;
  aggMedian: ReturnType<typeof aggMedian>;
  aggSinglePercentile: ReturnType<typeof aggSinglePercentile>;
  aggMin: ReturnType<typeof aggMin>;
  aggMovingAvg: ReturnType<typeof aggMovingAvg>;
  aggPercentileRanks: ReturnType<typeof aggPercentileRanks>;
  aggPercentiles: ReturnType<typeof aggPercentiles>;
  aggSerialDiff: ReturnType<typeof aggSerialDiff>;
  aggStdDeviation: ReturnType<typeof aggStdDeviation>;
  aggSum: ReturnType<typeof aggSum>;
  aggTopHit: ReturnType<typeof aggTopHit>;
  aggTopMetrics: ReturnType<typeof aggTopMetrics>;
}
