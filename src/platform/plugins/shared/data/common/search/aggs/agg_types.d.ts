import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import * as buckets from './buckets';
import type { CalculateBoundsFn } from './buckets';
import * as metrics from './metrics';
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
    metrics: ({
        name: metrics.METRIC_TYPES;
        fn: () => metrics.MetricAggType<metrics.IStdDevAggConfig>;
    } | {
        name: metrics.METRIC_TYPES;
        fn: ({ getFieldFormatsStart, }: metrics.PercentileRanksMetricAggDependencies) => metrics.MetricAggType<import("./metrics/lib/get_response_agg_config_class").IResponseAggConfig>;
    } | {
        name: metrics.METRIC_TYPES;
        fn: () => metrics.MetricAggType<any>;
    } | {
        name: metrics.METRIC_TYPES;
        fn: ({ getConfig }: metrics.FiltersMetricAggDependencies) => metrics.MetricAggType<metrics.IMetricAggConfig>;
    })[];
    buckets: ({
        name: buckets.BUCKET_TYPES;
        fn: ({ calculateBounds, aggExecutionContext, getConfig, }: AggTypesDependencies) => buckets.BucketAggType<buckets.IBucketDateHistogramAggConfig>;
    } | {
        name: buckets.BUCKET_TYPES;
        fn: ({ getConfig, getFieldFormatsStart, }: buckets.HistogramBucketAggDependencies) => buckets.BucketAggType<buckets.IBucketHistogramAggConfig>;
    } | {
        name: buckets.BUCKET_TYPES;
        fn: ({ aggExecutionContext, getConfig }: AggTypesDependencies) => buckets.BucketAggType<buckets.IBucketAggConfig>;
    } | {
        name: buckets.BUCKET_TYPES;
        fn: () => buckets.BucketAggType<any>;
    })[];
};
/** @internal */
export declare const getAggTypesFunctions: () => ((() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggDateHistogram", any, {
    id?: string | undefined;
    json?: string | undefined;
    format?: string | undefined;
    enabled?: boolean | undefined;
    interval?: string | undefined;
    schema?: string | undefined;
    timeRange?: import("..").KibanaTimerangeOutput | undefined;
    field?: (import("@kbn/es-query").DataViewFieldBase | string) | undefined;
    time_zone?: string | undefined;
    min_doc_count?: number | undefined;
    extended_bounds?: import("..").ExtendedBoundsOutput | undefined;
    customLabel?: string | undefined;
    scaleMetricValues?: boolean | undefined;
    timeShift?: string | undefined;
    useNormalizedEsInterval?: boolean | undefined;
    used_interval?: string | undefined;
    used_time_zone?: string | undefined;
    drop_partials?: boolean | undefined;
    extendToTimeRange?: boolean | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggTimeSeries", any, import("./types").BaseAggParams & Pick<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | import("@kbn/utility-types").SerializableRecord;
    schema?: string;
}, "id" | "enabled" | "schema">, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggSampler", any, buckets.AggParamsSampler & Pick<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | import("@kbn/utility-types").SerializableRecord;
    schema?: string;
}, "id" | "enabled" | "schema">, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggDiversifiedSampler", any, buckets.AggParamsDiversifiedSampler & Pick<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | import("@kbn/utility-types").SerializableRecord;
    schema?: string;
}, "id" | "enabled" | "schema">, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggSignificantText", any, buckets.AggParamsSignificantText & Pick<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | import("@kbn/utility-types").SerializableRecord;
    schema?: string;
}, "id" | "enabled" | "schema">, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggTopMetrics", any, metrics.AggParamsTopMetricsSerialized & Pick<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | import("@kbn/utility-types").SerializableRecord;
    schema?: string;
}, "id" | "enabled" | "schema">, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggFilter", any, {
    id?: string | undefined;
    json?: string | undefined;
    filter?: import("..").KibanaQueryOutput | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    geo_bounding_box?: import("..").GeoBoundingBoxOutput | undefined;
    customLabel?: string | undefined;
    timeShift?: string | undefined;
    timeWindow?: string | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggFilters", any, {
    filters?: import("..").QueryFilterOutput[] | undefined;
    id?: string | undefined;
    json?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    timeShift?: string | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggSignificantTerms", any, buckets.AggParamsSignificantTerms & Pick<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | import("@kbn/utility-types").SerializableRecord;
    schema?: string;
}, "id" | "enabled" | "schema">, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggIpPrefix", any, {
    id?: string | undefined;
    json?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    field: string;
    customLabel?: string | undefined;
    ipPrefix?: import("..").IpPrefixOutput | undefined;
    timeShift?: string | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggIpRange", any, {
    id?: string | undefined;
    json?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    field: string;
    ranges?: Array<import("..").CidrOutput | import("..").IpRangeOutput> | undefined;
    customLabel?: string | undefined;
    timeShift?: string | undefined;
    ipRangeType?: string | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggDateRange", any, {
    id?: string | undefined;
    json?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    field?: string | undefined;
    time_zone?: string | undefined;
    ranges?: import("..").DateRangeOutput[] | undefined;
    customLabel?: string | undefined;
    timeShift?: string | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggRange", any, {
    id?: string | undefined;
    json?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    field: string;
    ranges?: import("..").NumericalRangeOutput[] | undefined;
    customLabel?: string | undefined;
    timeShift?: string | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggGeoTile", any, buckets.AggParamsGeoTile & Pick<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | import("@kbn/utility-types").SerializableRecord;
    schema?: string;
}, "id" | "enabled" | "schema">, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggHistogram", any, {
    id?: string | undefined;
    json?: string | undefined;
    enabled?: boolean | undefined;
    interval: number | string;
    schema?: string | undefined;
    field: string;
    min_doc_count?: boolean | undefined;
    extended_bounds?: import("..").ExtendedBoundsOutput | undefined;
    customLabel?: string | undefined;
    timeShift?: string | undefined;
    used_interval?: number | string | undefined;
    maxBars?: number | undefined;
    intervalBase?: number | undefined;
    has_extended_bounds?: boolean | undefined;
    autoExtendBounds?: boolean | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggTerms", any, {
    size?: number | undefined;
    id?: string | undefined;
    json?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    order?: "asc" | "desc" | undefined;
    field: string;
    include?: string[] | string | number[] | undefined;
    exclude?: string[] | string | number[] | undefined;
    customLabel?: string | undefined;
    otherBucketLabel?: string | undefined;
    missingBucketLabel?: string | undefined;
    timeShift?: string | undefined;
    shardSize?: number | undefined;
    orderAgg?: import("./types").AggExpressionType | undefined;
    orderBy: string;
    missingBucket?: boolean | undefined;
    otherBucket?: boolean | undefined;
    includeIsRegex?: boolean | undefined;
    excludeIsRegex?: boolean | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggMultiTerms", any, {
    fields: string[];
    size?: number | undefined;
    id?: string | undefined;
    json?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    order?: "asc" | "desc" | undefined;
    customLabel?: string | undefined;
    otherBucketLabel?: string | undefined;
    timeShift?: string | undefined;
    shardSize?: number | undefined;
    orderAgg?: import("./types").AggExpressionType | undefined;
    orderBy: string;
    otherBucket?: boolean | undefined;
    separatorLabel?: string | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggRareTerms", any, buckets.AggParamsRareTerms & Pick<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | import("@kbn/utility-types").SerializableRecord;
    schema?: string;
}, "id" | "enabled" | "schema">, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggAvg", any, metrics.AggParamsAvg & Pick<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | import("@kbn/utility-types").SerializableRecord;
    schema?: string;
}, "id" | "enabled" | "schema">, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggBucketAvg", any, {
    id?: string | undefined;
    json?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    customLabel?: string | undefined;
    timeShift?: string | undefined;
    customBucket?: import("./types").AggExpressionType | undefined;
    customMetric?: import("./types").AggExpressionType | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggBucketMax", any, {
    id?: string | undefined;
    json?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    customLabel?: string | undefined;
    timeShift?: string | undefined;
    customBucket?: import("./types").AggExpressionType | undefined;
    customMetric?: import("./types").AggExpressionType | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggBucketMin", any, {
    id?: string | undefined;
    json?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    customLabel?: string | undefined;
    timeShift?: string | undefined;
    customBucket?: import("./types").AggExpressionType | undefined;
    customMetric?: import("./types").AggExpressionType | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggBucketSum", any, {
    id?: string | undefined;
    json?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    customLabel?: string | undefined;
    timeShift?: string | undefined;
    customBucket?: import("./types").AggExpressionType | undefined;
    customMetric?: import("./types").AggExpressionType | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggFilteredMetric", any, {
    id?: string | undefined;
    json?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    customLabel?: string | undefined;
    timeShift?: string | undefined;
    customBucket?: import("./types").AggExpressionType | undefined;
    customMetric?: import("./types").AggExpressionType | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggCardinality", any, metrics.AggParamsCardinality & Pick<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | import("@kbn/utility-types").SerializableRecord;
    schema?: string;
}, "id" | "enabled" | "schema">, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggValueCount", any, metrics.AggParamsValueCount & Pick<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | import("@kbn/utility-types").SerializableRecord;
    schema?: string;
}, "id" | "enabled" | "schema">, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggCount", any, metrics.AggParamsCount & Pick<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | import("@kbn/utility-types").SerializableRecord;
    schema?: string;
}, "id" | "enabled" | "schema">, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggCumulativeSum", any, {
    id?: string | undefined;
    json?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    buckets_path?: string | undefined;
    customLabel?: string | undefined;
    timeShift?: string | undefined;
    customMetric?: import("./types").AggExpressionType | undefined;
    metricAgg?: string | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggDerivative", any, {
    id?: string | undefined;
    json?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    buckets_path?: string | undefined;
    customLabel?: string | undefined;
    timeShift?: string | undefined;
    customMetric?: import("./types").AggExpressionType | undefined;
    metricAgg?: string | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggGeoBounds", any, metrics.AggParamsGeoBounds & Pick<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | import("@kbn/utility-types").SerializableRecord;
    schema?: string;
}, "id" | "enabled" | "schema">, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggGeoCentroid", any, metrics.AggParamsGeoCentroid & Pick<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | import("@kbn/utility-types").SerializableRecord;
    schema?: string;
}, "id" | "enabled" | "schema">, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggMax", any, metrics.AggParamsMax & Pick<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | import("@kbn/utility-types").SerializableRecord;
    schema?: string;
}, "id" | "enabled" | "schema">, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggMedian", any, metrics.AggParamsMedian & Pick<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | import("@kbn/utility-types").SerializableRecord;
    schema?: string;
}, "id" | "enabled" | "schema">, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggSinglePercentile", any, metrics.AggParamsSinglePercentile & Pick<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | import("@kbn/utility-types").SerializableRecord;
    schema?: string;
}, "id" | "enabled" | "schema">, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggSinglePercentileRank", any, metrics.AggParamsSinglePercentileRank & Pick<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | import("@kbn/utility-types").SerializableRecord;
    schema?: string;
}, "id" | "enabled" | "schema">, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggMin", any, metrics.AggParamsMin & Pick<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | import("@kbn/utility-types").SerializableRecord;
    schema?: string;
}, "id" | "enabled" | "schema">, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggMovingAvg", any, {
    id?: string | undefined;
    json?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    script?: string | undefined;
    buckets_path?: string | undefined;
    window?: number | undefined;
    customLabel?: string | undefined;
    timeShift?: string | undefined;
    customMetric?: import("./types").AggExpressionType | undefined;
    metricAgg?: string | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggPercentileRanks", any, metrics.AggParamsPercentileRanks & Pick<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | import("@kbn/utility-types").SerializableRecord;
    schema?: string;
}, "id" | "enabled" | "schema">, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggPercentiles", any, metrics.AggParamsPercentiles & Pick<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | import("@kbn/utility-types").SerializableRecord;
    schema?: string;
}, "id" | "enabled" | "schema">, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggSerialDiff", any, {
    id?: string | undefined;
    json?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    buckets_path?: string | undefined;
    customLabel?: string | undefined;
    timeShift?: string | undefined;
    customMetric?: import("./types").AggExpressionType | undefined;
    metricAgg?: string | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggStdDeviation", any, metrics.AggParamsStdDeviation & Pick<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | import("@kbn/utility-types").SerializableRecord;
    schema?: string;
}, "id" | "enabled" | "schema">, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggSum", any, metrics.AggParamsSum & Pick<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | import("@kbn/utility-types").SerializableRecord;
    schema?: string;
}, "id" | "enabled" | "schema">, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggTopHit", any, metrics.AggParamsTopHitSerialized & Pick<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | import("@kbn/utility-types").SerializableRecord;
    schema?: string;
}, "id" | "enabled" | "schema">, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggRate", any, metrics.AggParamsRate & Pick<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | import("@kbn/utility-types").SerializableRecord;
    schema?: string;
}, "id" | "enabled" | "schema">, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>))[];
