import type { TypeOf } from '@kbn/config-schema';
export declare const BUCKET_OP_TITLES: {
    readonly dateHistogram: "Date Histogram Operation";
    readonly terms: "Terms Operation";
    readonly filters: "Filters Operation";
    readonly histogram: "Histogram Operation";
    readonly ranges: "Ranges Operation";
};
export declare const bucketDateHistogramOperationSchema: import("@kbn/config-schema").ObjectType<{
    /**
     * Field to be used for the date histogram
     */
    field: import("@kbn/config-schema").Type<string>;
    /**
     * Suggested interval
     */
    suggested_interval: import("@kbn/config-schema").Type<string>;
    /**
     * Whether to use original time range
     */
    use_original_time_range: import("@kbn/config-schema").Type<boolean>;
    /**
     * Whether to include empty rows
     */
    include_empty_rows: import("@kbn/config-schema").Type<boolean>;
    drop_partial_intervals: import("@kbn/config-schema").Type<boolean | undefined>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    /**
     * Select bucket operation type
     */
    operation: import("@kbn/config-schema").Type<"date_histogram">;
}>;
declare const bucketTermsRankByCustomOperationSchema: import("@kbn/config-schema").ObjectType<Omit<{
    type: import("@kbn/config-schema").Type<"custom">;
    /**
     * Field to be used for the custom operation
     */
    field: import("@kbn/config-schema").Type<string>;
    /**
     * Direction of the custom operation
     */
    direction: import("@kbn/config-schema").Type<"asc" | "desc">;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "sum" | "average" | "median" | "last_value" | "unique_count" | "standard_deviation">;
}>;
declare const bucketTermsRankByCustomCountOperationSchema: import("@kbn/config-schema").ObjectType<Omit<{
    type: import("@kbn/config-schema").Type<"custom">;
    /**
     * Field to be used for the custom operation
     */
    field: import("@kbn/config-schema").Type<string>;
    /**
     * Direction of the custom operation
     */
    direction: import("@kbn/config-schema").Type<"asc" | "desc">;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}>;
declare const bucketTermsRankByPercentileOperationSchema: import("@kbn/config-schema").ObjectType<Omit<{
    type: import("@kbn/config-schema").Type<"custom">;
    /**
     * Field to be used for the custom operation
     */
    field: import("@kbn/config-schema").Type<string>;
    /**
     * Direction of the custom operation
     */
    direction: import("@kbn/config-schema").Type<"asc" | "desc">;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
}>;
declare const bucketTermsRankByPercentileRankOperationSchema: import("@kbn/config-schema").ObjectType<Omit<{
    type: import("@kbn/config-schema").Type<"custom">;
    /**
     * Field to be used for the custom operation
     */
    field: import("@kbn/config-schema").Type<string>;
    /**
     * Direction of the custom operation
     */
    direction: import("@kbn/config-schema").Type<"asc" | "desc">;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}>;
export declare const bucketTermsOperationSchema: import("@kbn/config-schema").ObjectType<{
    /**
     * Fields to be used for the terms
     */
    fields: import("@kbn/config-schema").Type<string[]>;
    /**
     * Maximum number of terms.
     */
    limit: import("@kbn/config-schema").Type<number>;
    /**
     * Whether to increase accuracy
     */
    increase_accuracy: import("@kbn/config-schema").Type<boolean | undefined>;
    /**
     * Includes
     */
    includes: import("@kbn/config-schema").Type<Readonly<{
        as_regex?: boolean | undefined;
    } & {
        values: string[];
    }> | undefined>;
    /**
     * Excludes
     */
    excludes: import("@kbn/config-schema").Type<Readonly<{
        as_regex?: boolean | undefined;
    } & {
        values: string[];
    }> | undefined>;
    /**
     * Other bucket
     */
    other_bucket: import("@kbn/config-schema").Type<Readonly<{} & {
        include_documents_without_field: boolean;
    }> | undefined>;
    /**
     * Rank by
     */
    rank_by: import("@kbn/config-schema").Type<Readonly<{} & {
        direction: "asc" | "desc";
        type: "alphabetical";
    }> | Readonly<{} & {
        type: "rare";
        max: number;
    }> | Readonly<{} & {
        type: "significant";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "metric";
        metric_index: number;
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        operation: "min" | "max" | "sum" | "average" | "median" | "last_value" | "unique_count" | "standard_deviation";
    }> | Readonly<{
        field?: string | undefined;
    } & {
        direction: "asc" | "desc";
        type: "custom";
        operation: "count";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        rank: number;
        operation: "percentile_rank";
    }> | undefined>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"terms">;
}>;
export declare const bucketFiltersOperationSchema: import("@kbn/config-schema").ObjectType<{
    /**
     * Filters
     */
    filters: import("@kbn/config-schema").Type<Readonly<{
        label?: string | undefined;
    } & {
        filter: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }>;
    }>[]>;
    label: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"filters">;
}>;
export declare const bucketHistogramOperationSchema: import("@kbn/config-schema").ObjectType<{
    /**
     * Label for the operation
     */
    label: import("@kbn/config-schema").Type<string | undefined>;
    /**
     * Field to be used for the histogram
     */
    field: import("@kbn/config-schema").Type<string>;
    /**
     * Granularity of the histogram
     */
    granularity: import("@kbn/config-schema").Type<number | "auto">;
    /**
     * Whether to include empty rows
     */
    include_empty_rows: import("@kbn/config-schema").Type<boolean>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"histogram">;
}>;
export declare const bucketRangesOperationSchema: import("@kbn/config-schema").ObjectType<{
    /**
     * Label for the operation
     */
    label: import("@kbn/config-schema").Type<string | undefined>;
    /**
     * Field to be used for the range
     */
    field: import("@kbn/config-schema").Type<string>;
    /**
     * Ranges
     */
    ranges: import("@kbn/config-schema").Type<Readonly<{
        label?: string | undefined;
        gt?: number | undefined;
        lte?: number | undefined;
    } & {}>[]>;
    format: import("@kbn/config-schema").Type<Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"range">;
}>;
export declare const bucketOperationDefinitionSchema: import("@kbn/config-schema").Type<Readonly<{
    label?: string | undefined;
    drop_partial_intervals?: boolean | undefined;
} & {
    field: string;
    operation: "date_histogram";
    suggested_interval: string;
    use_original_time_range: boolean;
    include_empty_rows: boolean;
}> | Readonly<{
    includes?: Readonly<{
        as_regex?: boolean | undefined;
    } & {
        values: string[];
    }> | undefined;
    format?: Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined;
    label?: string | undefined;
    excludes?: Readonly<{
        as_regex?: boolean | undefined;
    } & {
        values: string[];
    }> | undefined;
    increase_accuracy?: boolean | undefined;
    other_bucket?: Readonly<{} & {
        include_documents_without_field: boolean;
    }> | undefined;
    rank_by?: Readonly<{} & {
        direction: "asc" | "desc";
        type: "alphabetical";
    }> | Readonly<{} & {
        type: "rare";
        max: number;
    }> | Readonly<{} & {
        type: "significant";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "metric";
        metric_index: number;
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        operation: "min" | "max" | "sum" | "average" | "median" | "last_value" | "unique_count" | "standard_deviation";
    }> | Readonly<{
        field?: string | undefined;
    } & {
        direction: "asc" | "desc";
        type: "custom";
        operation: "count";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{} & {
        direction: "asc" | "desc";
        type: "custom";
        field: string;
        rank: number;
        operation: "percentile_rank";
    }> | undefined;
} & {
    fields: string[];
    limit: number;
    operation: "terms";
}> | Readonly<{
    format?: Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined;
    label?: string | undefined;
} & {
    field: string;
    operation: "histogram";
    include_empty_rows: boolean;
    granularity: number | "auto";
}> | Readonly<{
    format?: Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined;
    label?: string | undefined;
} & {
    field: string;
    ranges: Readonly<{
        label?: string | undefined;
        gt?: number | undefined;
        lte?: number | undefined;
    } & {}>[];
    operation: "range";
}> | Readonly<{
    label?: string | undefined;
} & {
    filters: Readonly<{
        label?: string | undefined;
    } & {
        filter: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }>;
    }>[];
    operation: "filters";
}>>;
export type TermOperationRankByCustomOperationType = TypeOf<typeof bucketTermsRankByCustomOperationSchema>;
export type TermOperationRankByCustomCountOperationType = TypeOf<typeof bucketTermsRankByCustomCountOperationSchema>;
export type TermOperationRankByCustomPercentileType = TypeOf<typeof bucketTermsRankByPercentileOperationSchema>;
export type TermOperationRankByCustomPercentileRankType = TypeOf<typeof bucketTermsRankByPercentileRankOperationSchema>;
export type LensApiDateHistogramOperation = typeof bucketDateHistogramOperationSchema.type;
export type LensApiTermsOperation = typeof bucketTermsOperationSchema.type;
export type LensApiHistogramOperation = typeof bucketHistogramOperationSchema.type;
export type LensApiRangeOperation = typeof bucketRangesOperationSchema.type;
export type LensApiFiltersOperation = typeof bucketFiltersOperationSchema.type;
export type LensApiBucketOperations = LensApiDateHistogramOperation | LensApiTermsOperation | LensApiHistogramOperation | LensApiRangeOperation | LensApiFiltersOperation;
export {};
