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
    field?: (import("@kbn/es-query").DataViewFieldBase | string) | undefined;
    customLabel?: string | undefined;
    timeRange?: import("..").KibanaTimerangeOutput | undefined;
    time_zone?: string | undefined;
    format?: string | undefined;
    enabled?: boolean | undefined;
    interval?: string | undefined;
    schema?: string | undefined;
    extended_bounds?: import("..").ExtendedBoundsOutput | undefined;
    scaleMetricValues?: boolean | undefined;
    json?: string | undefined;
    timeShift?: string | undefined;
    useNormalizedEsInterval?: boolean | undefined;
    used_interval?: string | undefined;
    used_time_zone?: string | undefined;
    drop_partials?: boolean | undefined;
    min_doc_count?: number | undefined;
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
    filter?: import("..").KibanaQueryOutput | undefined;
    customLabel?: string | undefined;
    geo_bounding_box?: import("..").GeoBoundingBoxOutput | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    json?: string | undefined;
    timeShift?: string | undefined;
    timeWindow?: string | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggFilters", any, {
    id?: string | undefined;
    filters?: import("..").QueryFilterOutput[] | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    json?: string | undefined;
    timeShift?: string | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggSignificantTerms", any, buckets.AggParamsSignificantTerms & Pick<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | import("@kbn/utility-types").SerializableRecord;
    schema?: string;
}, "id" | "enabled" | "schema">, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggIpPrefix", any, {
    id?: string | undefined;
    field: string;
    customLabel?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    ipPrefix?: import("..").IpPrefixOutput | undefined;
    json?: string | undefined;
    timeShift?: string | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggIpRange", any, {
    id?: string | undefined;
    field: string;
    customLabel?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    json?: string | undefined;
    timeShift?: string | undefined;
    ranges?: Array<import("..").CidrOutput | import("..").IpRangeOutput> | undefined;
    ipRangeType?: string | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggDateRange", any, {
    id?: string | undefined;
    field?: string | undefined;
    customLabel?: string | undefined;
    time_zone?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    json?: string | undefined;
    timeShift?: string | undefined;
    ranges?: import("..").DateRangeOutput[] | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggRange", any, {
    id?: string | undefined;
    field: string;
    customLabel?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    json?: string | undefined;
    timeShift?: string | undefined;
    ranges?: import("..").NumericalRangeOutput[] | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggGeoTile", any, buckets.AggParamsGeoTile & Pick<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | import("@kbn/utility-types").SerializableRecord;
    schema?: string;
}, "id" | "enabled" | "schema">, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggHistogram", any, {
    id?: string | undefined;
    field: string;
    customLabel?: string | undefined;
    enabled?: boolean | undefined;
    interval: number | string;
    schema?: string | undefined;
    extended_bounds?: import("..").ExtendedBoundsOutput | undefined;
    json?: string | undefined;
    timeShift?: string | undefined;
    used_interval?: number | string | undefined;
    min_doc_count?: boolean | undefined;
    maxBars?: number | undefined;
    intervalBase?: number | undefined;
    has_extended_bounds?: boolean | undefined;
    autoExtendBounds?: boolean | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggTerms", any, {
    id?: string | undefined;
    size?: number | undefined;
    field: string;
    order?: "asc" | "desc" | undefined;
    customLabel?: string | undefined;
    exclude?: string[] | string | number[] | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    include?: string[] | string | number[] | undefined;
    otherBucketLabel?: string | undefined;
    missingBucketLabel?: string | undefined;
    json?: string | undefined;
    timeShift?: string | undefined;
    shardSize?: number | undefined;
    orderAgg?: import("./types").AggExpressionType | undefined;
    orderBy: string;
    missingBucket?: boolean | undefined;
    otherBucket?: boolean | undefined;
    includeIsRegex?: boolean | undefined;
    excludeIsRegex?: boolean | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggMultiTerms", any, {
    id?: string | undefined;
    size?: number | undefined;
    order?: "asc" | "desc" | undefined;
    customLabel?: string | undefined;
    fields: string[];
    enabled?: boolean | undefined;
    schema?: string | undefined;
    otherBucketLabel?: string | undefined;
    json?: string | undefined;
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
    customLabel?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    json?: string | undefined;
    timeShift?: string | undefined;
    customBucket?: import("./types").AggExpressionType | undefined;
    customMetric?: import("./types").AggExpressionType | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggBucketMax", any, {
    id?: string | undefined;
    customLabel?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    json?: string | undefined;
    timeShift?: string | undefined;
    customBucket?: import("./types").AggExpressionType | undefined;
    customMetric?: import("./types").AggExpressionType | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggBucketMin", any, {
    id?: string | undefined;
    customLabel?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    json?: string | undefined;
    timeShift?: string | undefined;
    customBucket?: import("./types").AggExpressionType | undefined;
    customMetric?: import("./types").AggExpressionType | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggBucketSum", any, {
    id?: string | undefined;
    customLabel?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    json?: string | undefined;
    timeShift?: string | undefined;
    customBucket?: import("./types").AggExpressionType | undefined;
    customMetric?: import("./types").AggExpressionType | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggFilteredMetric", any, {
    id?: string | undefined;
    customLabel?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    json?: string | undefined;
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
    customLabel?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    json?: string | undefined;
    timeShift?: string | undefined;
    customMetric?: import("./types").AggExpressionType | undefined;
    metricAgg?: string | undefined;
    buckets_path?: string | undefined;
}, import("./types").AggExpressionType, import("../../../../expressions/common").ExecutionContext<import("../../../../inspector/common").Adapters>>) | (() => import("../../../../expressions/common").ExpressionFunctionDefinition<"aggDerivative", any, {
    id?: string | undefined;
    customLabel?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    json?: string | undefined;
    timeShift?: string | undefined;
    customMetric?: import("./types").AggExpressionType | undefined;
    metricAgg?: string | undefined;
    buckets_path?: string | undefined;
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
    script?: string | undefined;
    customLabel?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    json?: string | undefined;
    timeShift?: string | undefined;
    customMetric?: import("./types").AggExpressionType | undefined;
    metricAgg?: string | undefined;
    buckets_path?: string | undefined;
    window?: number | undefined;
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
    customLabel?: string | undefined;
    enabled?: boolean | undefined;
    schema?: string | undefined;
    json?: string | undefined;
    timeShift?: string | undefined;
    customMetric?: import("./types").AggExpressionType | undefined;
    metricAgg?: string | undefined;
    buckets_path?: string | undefined;
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
