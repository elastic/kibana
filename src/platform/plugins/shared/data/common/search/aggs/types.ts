/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Assign } from '@kbn/utility-types';
import type { DataView } from '@kbn/data-views-plugin/common';
import { type aggTimeSeries } from './buckets/time_series_fn';
import {
  type aggAvg,
  type aggBucketAvg,
  type aggBucketMax,
  type aggBucketMin,
  type aggBucketSum,
  type aggCardinality,
  type aggValueCount,
  type AggConfigs,
  type AggConfigSerialized,
  type aggCount,
  type aggCumulativeSum,
  type aggDateHistogram,
  type aggDateRange,
  type aggDerivative,
  type aggFilter,
  type aggFilters,
  type aggGeoBounds,
  type aggGeoCentroid,
  type aggGeoTile,
  type aggHistogram,
  type aggIpPrefix,
  type aggIpRange,
  type aggMax,
  type aggMedian,
  type aggMin,
  type aggMovingAvg,
  type aggRate,
  type AggParamsAvg,
  type AggParamsBucketAvg,
  type AggParamsBucketAvgSerialized,
  type AggParamsBucketMax,
  type AggParamsBucketMaxSerialized,
  type AggParamsBucketMin,
  type AggParamsBucketMinSerialized,
  type AggParamsBucketSum,
  type AggParamsBucketSumSerialized,
  type AggParamsFilteredMetric,
  type AggParamsCardinality,
  type AggParamsValueCount,
  type AggParamsCumulativeSum,
  type AggParamsCumulativeSumSerialized,
  type AggParamsDateHistogram,
  type AggParamsDateRange,
  type AggParamsDerivative,
  type AggParamsFilter,
  type AggParamsFilters,
  type AggParamsGeoBounds,
  type AggParamsGeoCentroid,
  type AggParamsGeoTile,
  type AggParamsHistogram,
  type AggParamsIpPrefix,
  type AggParamsIpRange,
  type AggParamsMax,
  type AggParamsMedian,
  type AggParamsSinglePercentile,
  type AggParamsSinglePercentileRank,
  type AggParamsMin,
  type AggParamsMovingAvg,
  type AggParamsPercentileRanks,
  type AggParamsPercentiles,
  type AggParamsRange,
  type AggParamsRate,
  type AggParamsSerialDiff,
  type AggParamsSignificantTerms,
  type AggParamsStdDeviation,
  type AggParamsSum,
  type AggParamsTerms,
  type AggParamsTermsSerialized,
  type AggParamsMultiTerms,
  type AggParamsMultiTermsSerialized,
  type AggParamsRareTerms,
  type AggParamsTopHit,
  type AggParamsTopMetrics,
  type AggParamsTopMetricsSerialized,
  type aggPercentileRanks,
  type aggPercentiles,
  type aggRange,
  type aggSerialDiff,
  type aggSignificantTerms,
  type aggStdDeviation,
  type aggSum,
  type aggTerms,
  type aggMultiTerms,
  type aggRareTerms,
  type aggTopHit,
  type AggTypesRegistry,
  type AggTypesRegistrySetup,
  type AggTypesRegistryStart,
  type BUCKET_TYPES,
  type CreateAggConfigParams,
  type getCalculateAutoTimeExpression,
  type METRIC_TYPES,
  type aggFilteredMetric,
  type aggSinglePercentile,
  type aggSinglePercentileRank,
  type AggConfigsOptions,
  type AggParamsCount,
  type AggParamsDerivativeSerialized,
  type AggParamsFilteredMetricSerialized,
  type AggParamsMovingAvgSerialized,
  type AggParamsSerialDiffSerialized,
  type AggParamsTopHitSerialized,
  type AggParamsTimeSeries,
} from '.';
import { type AggParamsSampler } from './buckets/sampler';
import { type AggParamsDiversifiedSampler } from './buckets/diversified_sampler';
import { type AggParamsSignificantText } from './buckets/significant_text';
import { type aggTopMetrics } from './metrics/top_metrics_fn';

export type { IAggConfig, AggConfigSerialized } from './agg_config';
export type { CreateAggConfigParams, IAggConfigs, AggConfigsOptions } from './agg_configs';
export type { IAggType } from './agg_type';
export type { AggParam, AggParamOption } from './agg_params';
export type { IFieldParamType } from './param_types';
export type { IMetricAggType } from './metrics/metric_agg_type';
export type { IpPrefixKey } from './buckets/lib/ip_prefix';
export type { IpRangeKey } from './buckets/lib/ip_range';
export type { OptionedValueProp } from './param_types/optioned';

export interface AggsCommonSetup {
  types: AggTypesRegistrySetup;
}

export interface AggsCommonStart {
  calculateAutoTimeExpression: ReturnType<typeof getCalculateAutoTimeExpression>;
  createAggConfigs: (
    indexPattern: DataView,
    configStates?: CreateAggConfigParams[],
    options?: Partial<AggConfigsOptions>
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
export type AggExpressionFunctionArgs<Name extends keyof SerializedAggParamsMapping> =
  SerializedAggParamsMapping[Name] & Pick<AggConfigSerialized, 'id' | 'enabled' | 'schema'>;

/**
 * A global list of the param interfaces for each agg type.
 * For now this is internal, but eventually we will probably
 * want to make it public.
 *
 * @internal
 */
interface SerializedAggParamsMapping {
  [BUCKET_TYPES.RANGE]: AggParamsRange;
  [BUCKET_TYPES.IP_PREFIX]: AggParamsIpPrefix;
  [BUCKET_TYPES.IP_RANGE]: AggParamsIpRange;
  [BUCKET_TYPES.DATE_RANGE]: AggParamsDateRange;
  [BUCKET_TYPES.FILTER]: AggParamsFilter;
  [BUCKET_TYPES.FILTERS]: AggParamsFilters;
  [BUCKET_TYPES.SIGNIFICANT_TERMS]: AggParamsSignificantTerms;
  [BUCKET_TYPES.SIGNIFICANT_TEXT]: AggParamsSignificantText;
  [BUCKET_TYPES.GEOTILE_GRID]: AggParamsGeoTile;
  [BUCKET_TYPES.HISTOGRAM]: AggParamsHistogram;
  [BUCKET_TYPES.DATE_HISTOGRAM]: AggParamsDateHistogram;
  [BUCKET_TYPES.TERMS]: AggParamsTermsSerialized;
  [BUCKET_TYPES.TIME_SERIES]: AggParamsTimeSeries;
  [BUCKET_TYPES.MULTI_TERMS]: AggParamsMultiTermsSerialized;
  [BUCKET_TYPES.RARE_TERMS]: AggParamsRareTerms;
  [BUCKET_TYPES.SAMPLER]: AggParamsSampler;
  [BUCKET_TYPES.DIVERSIFIED_SAMPLER]: AggParamsDiversifiedSampler;
  [METRIC_TYPES.AVG]: AggParamsAvg;
  [METRIC_TYPES.CARDINALITY]: AggParamsCardinality;
  [METRIC_TYPES.COUNT]: AggParamsCount;
  [METRIC_TYPES.VALUE_COUNT]: AggParamsValueCount;
  [METRIC_TYPES.GEO_BOUNDS]: AggParamsGeoBounds;
  [METRIC_TYPES.GEO_CENTROID]: AggParamsGeoCentroid;
  [METRIC_TYPES.MAX]: AggParamsMax;
  [METRIC_TYPES.MEDIAN]: AggParamsMedian;
  [METRIC_TYPES.SINGLE_PERCENTILE]: AggParamsSinglePercentile;
  [METRIC_TYPES.SINGLE_PERCENTILE_RANK]: AggParamsSinglePercentileRank;
  [METRIC_TYPES.MIN]: AggParamsMin;
  [METRIC_TYPES.STD_DEV]: AggParamsStdDeviation;
  [METRIC_TYPES.SUM]: AggParamsSum;
  [METRIC_TYPES.AVG_BUCKET]: AggParamsBucketAvgSerialized;
  [METRIC_TYPES.MAX_BUCKET]: AggParamsBucketMaxSerialized;
  [METRIC_TYPES.MIN_BUCKET]: AggParamsBucketMinSerialized;
  [METRIC_TYPES.SUM_BUCKET]: AggParamsBucketSumSerialized;
  [METRIC_TYPES.FILTERED_METRIC]: AggParamsFilteredMetricSerialized;
  [METRIC_TYPES.CUMULATIVE_SUM]: AggParamsCumulativeSumSerialized;
  [METRIC_TYPES.DERIVATIVE]: AggParamsDerivativeSerialized;
  [METRIC_TYPES.MOVING_FN]: AggParamsMovingAvgSerialized;
  [METRIC_TYPES.PERCENTILE_RANKS]: AggParamsPercentileRanks;
  [METRIC_TYPES.PERCENTILES]: AggParamsPercentiles;
  [METRIC_TYPES.RATE]: AggParamsRate;
  [METRIC_TYPES.SERIAL_DIFF]: AggParamsSerialDiffSerialized;
  [METRIC_TYPES.TOP_HITS]: AggParamsTopHitSerialized;
  [METRIC_TYPES.TOP_METRICS]: AggParamsTopMetricsSerialized;
}

export interface AggParamsMapping {
  [BUCKET_TYPES.RANGE]: AggParamsRange;
  [BUCKET_TYPES.IP_PREFIX]: AggParamsIpPrefix;
  [BUCKET_TYPES.IP_RANGE]: AggParamsIpRange;
  [BUCKET_TYPES.DATE_RANGE]: AggParamsDateRange;
  [BUCKET_TYPES.FILTER]: AggParamsFilter;
  [BUCKET_TYPES.FILTERS]: AggParamsFilters;
  [BUCKET_TYPES.SIGNIFICANT_TERMS]: AggParamsSignificantTerms;
  [BUCKET_TYPES.SIGNIFICANT_TEXT]: AggParamsSignificantText;
  [BUCKET_TYPES.GEOTILE_GRID]: AggParamsGeoTile;
  [BUCKET_TYPES.HISTOGRAM]: AggParamsHistogram;
  [BUCKET_TYPES.DATE_HISTOGRAM]: AggParamsDateHistogram;
  [BUCKET_TYPES.TERMS]: AggParamsTerms;
  [BUCKET_TYPES.TIME_SERIES]: AggParamsTimeSeries;
  [BUCKET_TYPES.MULTI_TERMS]: AggParamsMultiTerms;
  [BUCKET_TYPES.RARE_TERMS]: AggParamsRareTerms;
  [BUCKET_TYPES.SAMPLER]: AggParamsSampler;
  [BUCKET_TYPES.DIVERSIFIED_SAMPLER]: AggParamsDiversifiedSampler;
  [METRIC_TYPES.AVG]: AggParamsAvg;
  [METRIC_TYPES.CARDINALITY]: AggParamsCardinality;
  [METRIC_TYPES.COUNT]: AggParamsCount;
  [METRIC_TYPES.VALUE_COUNT]: AggParamsValueCount;
  [METRIC_TYPES.GEO_BOUNDS]: AggParamsGeoBounds;
  [METRIC_TYPES.GEO_CENTROID]: AggParamsGeoCentroid;
  [METRIC_TYPES.MAX]: AggParamsMax;
  [METRIC_TYPES.MEDIAN]: AggParamsMedian;
  [METRIC_TYPES.SINGLE_PERCENTILE]: AggParamsSinglePercentile;
  [METRIC_TYPES.SINGLE_PERCENTILE_RANK]: AggParamsSinglePercentileRank;
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
  [METRIC_TYPES.RATE]: AggParamsRate;
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
  aggIpPrefix: ReturnType<typeof aggIpPrefix>;
  aggIpRange: ReturnType<typeof aggIpRange>;
  aggDateRange: ReturnType<typeof aggDateRange>;
  aggRange: ReturnType<typeof aggRange>;
  aggGeoTile: ReturnType<typeof aggGeoTile>;
  aggHistogram: ReturnType<typeof aggHistogram>;
  aggDateHistogram: ReturnType<typeof aggDateHistogram>;
  aggTerms: ReturnType<typeof aggTerms>;
  aggTimeSeries: ReturnType<typeof aggTimeSeries>;
  aggMultiTerms: ReturnType<typeof aggMultiTerms>;
  aggRareTerms: ReturnType<typeof aggRareTerms>;
  aggAvg: ReturnType<typeof aggAvg>;
  aggBucketAvg: ReturnType<typeof aggBucketAvg>;
  aggBucketMax: ReturnType<typeof aggBucketMax>;
  aggBucketMin: ReturnType<typeof aggBucketMin>;
  aggBucketSum: ReturnType<typeof aggBucketSum>;
  aggFilteredMetric: ReturnType<typeof aggFilteredMetric>;
  aggCardinality: ReturnType<typeof aggCardinality>;
  aggValueCount: ReturnType<typeof aggValueCount>;
  aggCount: ReturnType<typeof aggCount>;
  aggCumulativeSum: ReturnType<typeof aggCumulativeSum>;
  aggDerivative: ReturnType<typeof aggDerivative>;
  aggGeoBounds: ReturnType<typeof aggGeoBounds>;
  aggGeoCentroid: ReturnType<typeof aggGeoCentroid>;
  aggMax: ReturnType<typeof aggMax>;
  aggMedian: ReturnType<typeof aggMedian>;
  aggSinglePercentile: ReturnType<typeof aggSinglePercentile>;
  aggSinglePercentileRank: ReturnType<typeof aggSinglePercentileRank>;
  aggMin: ReturnType<typeof aggMin>;
  aggMovingAvg: ReturnType<typeof aggMovingAvg>;
  aggPercentileRanks: ReturnType<typeof aggPercentileRanks>;
  aggPercentiles: ReturnType<typeof aggPercentiles>;
  aggSerialDiff: ReturnType<typeof aggSerialDiff>;
  aggStdDeviation: ReturnType<typeof aggStdDeviation>;
  aggSum: ReturnType<typeof aggSum>;
  aggTopHit: ReturnType<typeof aggTopHit>;
  aggTopMetrics: ReturnType<typeof aggTopMetrics>;
  aggRate: ReturnType<typeof aggRate>;
}
