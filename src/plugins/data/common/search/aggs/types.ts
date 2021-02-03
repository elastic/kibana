/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Assign } from '@kbn/utility-types';
import { DatatableColumn } from 'src/plugins/expressions';
import { IndexPattern } from '../../index_patterns/index_patterns/index_pattern';
import { TimeRange } from '../../query';
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
  AggParamsTopHit,
  aggPercentileRanks,
  aggPercentiles,
  aggRange,
  aggSerialDiff,
  aggSignificantTerms,
  aggStdDeviation,
  aggSum,
  aggTerms,
  aggTopHit,
  AggTypesRegistry,
  AggTypesRegistrySetup,
  AggTypesRegistryStart,
  BUCKET_TYPES,
  CreateAggConfigParams,
  getCalculateAutoTimeExpression,
  METRIC_TYPES,
  AggConfig,
} from './';

export { IAggConfig, AggConfigSerialized } from './agg_config';
export { CreateAggConfigParams, IAggConfigs } from './agg_configs';
export { IAggType } from './agg_type';
export { AggParam, AggParamOption } from './agg_params';
export { IFieldParamType } from './param_types';
export { IMetricAggType } from './metrics/metric_agg_type';
export { DateRangeKey } from './buckets/lib/date_range';
export { IpRangeKey } from './buckets/lib/ip_range';
export { OptionedValueProp } from './param_types/optioned';

/** @internal */
export interface AggsCommonSetup {
  types: AggTypesRegistrySetup;
}

/** @internal */
export interface AggsCommonStart {
  calculateAutoTimeExpression: ReturnType<typeof getCalculateAutoTimeExpression>;
  /**
   * Helper function returning meta data about use date intervals for a data table column.
   * If the column is not a column created by a date histogram aggregation of the esaggs data source,
   * this function will return undefined.
   *
   * Otherwise, it will return the following attributes in an object:
   * * `timeZone` time zone used to create the buckets (important e.g. for DST),
   * * `timeRange` total time range of the fetch data (to infer partial buckets at the beginning and end of the data)
   * * `interval` Interval used on elasticsearch (`auto` resolved to the actual interval)
   */
  getDateMetaByDatatableColumn: (
    column: DatatableColumn
  ) => Promise<undefined | { timeZone: string; timeRange?: TimeRange; interval: string }>;
  datatableUtilities: {
    getIndexPattern: (column: DatatableColumn) => Promise<IndexPattern | undefined>;
    getAggConfig: (column: DatatableColumn) => Promise<AggConfig | undefined>;
    isFilterable: (column: DatatableColumn) => boolean;
  };
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

/** @internal */
export interface BaseAggParams {
  json?: string;
  customLabel?: string;
}

/** @internal */
export interface AggExpressionType {
  type: 'agg_type';
  value: AggConfigSerialized;
}

/** @internal */
export type AggExpressionFunctionArgs<
  Name extends keyof AggParamsMapping
> = AggParamsMapping[Name] & Pick<AggConfigSerialized, 'id' | 'enabled' | 'schema'>;

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
  [BUCKET_TYPES.GEOTILE_GRID]: AggParamsGeoTile;
  [BUCKET_TYPES.GEOHASH_GRID]: AggParamsGeoHash;
  [BUCKET_TYPES.HISTOGRAM]: AggParamsHistogram;
  [BUCKET_TYPES.DATE_HISTOGRAM]: AggParamsDateHistogram;
  [BUCKET_TYPES.TERMS]: AggParamsTerms;
  [METRIC_TYPES.AVG]: AggParamsAvg;
  [METRIC_TYPES.CARDINALITY]: AggParamsCardinality;
  [METRIC_TYPES.COUNT]: BaseAggParams;
  [METRIC_TYPES.GEO_BOUNDS]: AggParamsGeoBounds;
  [METRIC_TYPES.GEO_CENTROID]: AggParamsGeoCentroid;
  [METRIC_TYPES.MAX]: AggParamsMax;
  [METRIC_TYPES.MEDIAN]: AggParamsMedian;
  [METRIC_TYPES.MIN]: AggParamsMin;
  [METRIC_TYPES.STD_DEV]: AggParamsStdDeviation;
  [METRIC_TYPES.SUM]: AggParamsSum;
  [METRIC_TYPES.AVG_BUCKET]: AggParamsBucketAvg;
  [METRIC_TYPES.MAX_BUCKET]: AggParamsBucketMax;
  [METRIC_TYPES.MIN_BUCKET]: AggParamsBucketMin;
  [METRIC_TYPES.SUM_BUCKET]: AggParamsBucketSum;
  [METRIC_TYPES.CUMULATIVE_SUM]: AggParamsCumulativeSum;
  [METRIC_TYPES.DERIVATIVE]: AggParamsDerivative;
  [METRIC_TYPES.MOVING_FN]: AggParamsMovingAvg;
  [METRIC_TYPES.PERCENTILE_RANKS]: AggParamsPercentileRanks;
  [METRIC_TYPES.PERCENTILES]: AggParamsPercentiles;
  [METRIC_TYPES.SERIAL_DIFF]: AggParamsSerialDiff;
  [METRIC_TYPES.TOP_HITS]: AggParamsTopHit;
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
  aggAvg: ReturnType<typeof aggAvg>;
  aggBucketAvg: ReturnType<typeof aggBucketAvg>;
  aggBucketMax: ReturnType<typeof aggBucketMax>;
  aggBucketMin: ReturnType<typeof aggBucketMin>;
  aggBucketSum: ReturnType<typeof aggBucketSum>;
  aggCardinality: ReturnType<typeof aggCardinality>;
  aggCount: ReturnType<typeof aggCount>;
  aggCumulativeSum: ReturnType<typeof aggCumulativeSum>;
  aggDerivative: ReturnType<typeof aggDerivative>;
  aggGeoBounds: ReturnType<typeof aggGeoBounds>;
  aggGeoCentroid: ReturnType<typeof aggGeoCentroid>;
  aggMax: ReturnType<typeof aggMax>;
  aggMedian: ReturnType<typeof aggMedian>;
  aggMin: ReturnType<typeof aggMin>;
  aggMovingAvg: ReturnType<typeof aggMovingAvg>;
  aggPercentileRanks: ReturnType<typeof aggPercentileRanks>;
  aggPercentiles: ReturnType<typeof aggPercentiles>;
  aggSerialDiff: ReturnType<typeof aggSerialDiff>;
  aggStdDeviation: ReturnType<typeof aggStdDeviation>;
  aggSum: ReturnType<typeof aggSum>;
  aggTopHit: ReturnType<typeof aggTopHit>;
}
