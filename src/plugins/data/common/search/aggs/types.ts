/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Assign } from '@kbn/utility-types';
import type { DatatableColumn } from '../../../../expressions/common/expression_types/specs/datatable';
import { IndexPattern } from '../../index_patterns/index_patterns/index_pattern';
import type { AggConfigSerialized } from './agg_config';
import { AggConfig } from './agg_config';
import type { CreateAggConfigParams } from './agg_configs';
import { AggConfigs } from './agg_configs';
import type { AggTypesRegistrySetup, AggTypesRegistryStart } from './agg_types_registry';
import { AggTypesRegistry } from './agg_types_registry';
import { BUCKET_TYPES } from './buckets/bucket_agg_types';
import type { AggParamsDateHistogram } from './buckets/date_histogram';
import { aggDateHistogram } from './buckets/date_histogram_fn';
import type { AggParamsDateRange } from './buckets/date_range';
import { aggDateRange } from './buckets/date_range_fn';
import type { AggParamsFilter } from './buckets/filter';
import type { AggParamsFilters } from './buckets/filters';
import { aggFilters } from './buckets/filters_fn';
import { aggFilter } from './buckets/filter_fn';
import type { AggParamsGeoHash } from './buckets/geo_hash';
import { aggGeoHash } from './buckets/geo_hash_fn';
import type { AggParamsGeoTile } from './buckets/geo_tile';
import { aggGeoTile } from './buckets/geo_tile_fn';
import type { AggParamsHistogram } from './buckets/histogram';
import { aggHistogram } from './buckets/histogram_fn';
import type { AggParamsIpRange } from './buckets/ip_range';
import { aggIpRange } from './buckets/ip_range_fn';
import type { AggParamsRange } from './buckets/range';
import { aggRange } from './buckets/range_fn';
import type { AggParamsSignificantTerms } from './buckets/significant_terms';
import { aggSignificantTerms } from './buckets/significant_terms_fn';
import type { AggParamsTerms } from './buckets/terms';
import { aggTerms } from './buckets/terms_fn';
import type { AggParamsAvg } from './metrics/avg';
import { aggAvg } from './metrics/avg_fn';
import type { AggParamsBucketAvg } from './metrics/bucket_avg';
import { aggBucketAvg } from './metrics/bucket_avg_fn';
import type { AggParamsBucketMax } from './metrics/bucket_max';
import { aggBucketMax } from './metrics/bucket_max_fn';
import type { AggParamsBucketMin } from './metrics/bucket_min';
import { aggBucketMin } from './metrics/bucket_min_fn';
import type { AggParamsBucketSum } from './metrics/bucket_sum';
import { aggBucketSum } from './metrics/bucket_sum_fn';
import type { AggParamsCardinality } from './metrics/cardinality';
import { aggCardinality } from './metrics/cardinality_fn';
import { aggCount } from './metrics/count_fn';
import type { AggParamsCumulativeSum } from './metrics/cumulative_sum';
import { aggCumulativeSum } from './metrics/cumulative_sum_fn';
import type { AggParamsDerivative } from './metrics/derivative';
import { aggDerivative } from './metrics/derivative_fn';
import type { AggParamsFilteredMetric } from './metrics/filtered_metric';
import { aggFilteredMetric } from './metrics/filtered_metric_fn';
import type { AggParamsGeoBounds } from './metrics/geo_bounds';
import { aggGeoBounds } from './metrics/geo_bounds_fn';
import type { AggParamsGeoCentroid } from './metrics/geo_centroid';
import { aggGeoCentroid } from './metrics/geo_centroid_fn';
import type { AggParamsMax } from './metrics/max';
import { aggMax } from './metrics/max_fn';
import type { AggParamsMedian } from './metrics/median';
import { aggMedian } from './metrics/median_fn';
import { METRIC_TYPES } from './metrics/metric_agg_types';
import type { AggParamsMin } from './metrics/min';
import { aggMin } from './metrics/min_fn';
import type { AggParamsMovingAvg } from './metrics/moving_avg';
import { aggMovingAvg } from './metrics/moving_avg_fn';
import type { AggParamsPercentiles } from './metrics/percentiles';
import { aggPercentiles } from './metrics/percentiles_fn';
import type { AggParamsPercentileRanks } from './metrics/percentile_ranks';
import { aggPercentileRanks } from './metrics/percentile_ranks_fn';
import type { AggParamsSerialDiff } from './metrics/serial_diff';
import { aggSerialDiff } from './metrics/serial_diff_fn';
import type { AggParamsSinglePercentile } from './metrics/single_percentile';
import { aggSinglePercentile } from './metrics/single_percentile_fn';
import type { AggParamsStdDeviation } from './metrics/std_deviation';
import { aggStdDeviation } from './metrics/std_deviation_fn';
import type { AggParamsSum } from './metrics/sum';
import { aggSum } from './metrics/sum_fn';
import type { AggParamsTopHit } from './metrics/top_hit';
import { aggTopHit } from './metrics/top_hit_fn';
import { getCalculateAutoTimeExpression } from './utils/calculate_auto_time_expression';

export { AggConfigSerialized, IAggConfig } from './agg_config';
export { CreateAggConfigParams, IAggConfigs } from './agg_configs';
export { AggParam, AggParamOption } from './agg_params';
export { IAggType } from './agg_type';
export { IpRangeKey } from './buckets/lib/ip_range';
export { IMetricAggType } from './metrics/metric_agg_type';
export { IFieldParamType } from './param_types';
export { OptionedValueProp } from './param_types/optioned';

/** @internal */
export interface AggsCommonSetup {
  types: AggTypesRegistrySetup;
}

/** @internal */
export interface AggsCommonStart {
  calculateAutoTimeExpression: ReturnType<typeof getCalculateAutoTimeExpression>;
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
  timeShift?: string;
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
}
