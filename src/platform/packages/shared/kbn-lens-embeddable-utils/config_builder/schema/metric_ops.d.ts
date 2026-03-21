import type { TypeOf } from '@kbn/config-schema';
export declare const genericOperationOptionsSchema: import("@kbn/config-schema").ObjectType<{
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined>;
}>;
export declare const staticOperationDefinitionSchema: import("@kbn/config-schema").ObjectType<Omit<{
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined>;
}, "value" | "operation"> & {
    value: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"static_value">;
}>;
export declare const formulaOperationDefinitionSchema: import("@kbn/config-schema").ObjectType<Omit<{
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined>;
}, "filter" | "operation" | "formula" | "reduced_time_range" | "time_scale"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined>;
    operation: import("@kbn/config-schema").Type<"formula">;
    formula: import("@kbn/config-schema").Type<string>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_scale: import("@kbn/config-schema").Type<"s" | "m" | "d" | "h" | undefined>;
}>;
export declare const esqlColumnSchema: import("@kbn/config-schema").ObjectType<{
    /**
     * Value
     */
    operation: import("@kbn/config-schema").Type<"value">;
    column: import("@kbn/config-schema").Type<string>;
}>;
export declare const esqlColumnOperationWithLabelAndFormatSchema: import("@kbn/config-schema").ObjectType<Omit<{
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined>;
}, "operation" | "column"> & {
    operation: import("@kbn/config-schema").Type<"value">;
    column: import("@kbn/config-schema").Type<string>;
}>;
export declare const metricOperationSharedSchema: import("@kbn/config-schema").ObjectType<Omit<{
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined>;
}, "filter" | "reduced_time_range" | "time_shift" | "time_scale"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
    time_scale: import("@kbn/config-schema").Type<"s" | "m" | "d" | "h" | undefined>;
}>;
export declare const fieldBasedOperationSharedSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<{
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined>;
}, "filter" | "reduced_time_range" | "time_shift" | "time_scale"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
    time_scale: import("@kbn/config-schema").Type<"s" | "m" | "d" | "h" | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}>;
export declare const countMetricOperationSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<Omit<Omit<{
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined>;
}, "filter" | "reduced_time_range" | "time_shift" | "time_scale"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
    time_scale: import("@kbn/config-schema").Type<"s" | "m" | "d" | "h" | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "field" | "operation"> & {
    field: import("@kbn/config-schema").Type<string | undefined>;
    operation: import("@kbn/config-schema").Type<"count">;
}>;
export declare const uniqueCountMetricOperationSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<Omit<Omit<{
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined>;
}, "filter" | "reduced_time_range" | "time_shift" | "time_scale"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
    time_scale: import("@kbn/config-schema").Type<"s" | "m" | "d" | "h" | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"unique_count">;
}>;
export declare const metricOperationSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<Omit<{
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined>;
}, "filter" | "reduced_time_range" | "time_shift" | "time_scale"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
    time_scale: import("@kbn/config-schema").Type<"s" | "m" | "d" | "h" | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"max" | "min" | "median" | "average" | "standard_deviation">;
}>;
export declare const sumMetricOperationSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<Omit<Omit<{
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined>;
}, "filter" | "reduced_time_range" | "time_shift" | "time_scale"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
    time_scale: import("@kbn/config-schema").Type<"s" | "m" | "d" | "h" | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "empty_as_null"> & {
    empty_as_null: import("@kbn/config-schema").Type<boolean>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"sum">;
}>;
export declare const lastValueOperationSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<Omit<{
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined>;
}, "filter" | "reduced_time_range" | "time_shift" | "time_scale"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
    time_scale: import("@kbn/config-schema").Type<"s" | "m" | "d" | "h" | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "sort_by" | "show_array_values"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    sort_by: import("@kbn/config-schema").Type<string>;
    show_array_values: import("@kbn/config-schema").Type<boolean>;
}>;
export declare const percentileOperationSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<Omit<{
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined>;
}, "filter" | "reduced_time_range" | "time_shift" | "time_scale"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
    time_scale: import("@kbn/config-schema").Type<"s" | "m" | "d" | "h" | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "percentile"> & {
    operation: import("@kbn/config-schema").Type<"percentile">;
    percentile: import("@kbn/config-schema").Type<number>;
}>;
export declare const percentileRanksOperationSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<Omit<{
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined>;
}, "filter" | "reduced_time_range" | "time_shift" | "time_scale"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
    time_scale: import("@kbn/config-schema").Type<"s" | "m" | "d" | "h" | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "rank"> & {
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
    rank: import("@kbn/config-schema").Type<number>;
}>;
export declare const fieldMetricOperationsSchema: import("@kbn/config-schema").Type<Readonly<{
    field?: string | undefined;
    filter?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
    time_scale?: "s" | "m" | "d" | "h" | undefined;
} & {
    operation: "count";
    empty_as_null: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
    time_scale?: "s" | "m" | "d" | "h" | undefined;
} & {
    field: string;
    operation: "unique_count";
    empty_as_null: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
    time_scale?: "s" | "m" | "d" | "h" | undefined;
} & {
    field: string;
    operation: "max" | "min" | "median" | "average" | "standard_deviation";
}> | Readonly<{
    filter?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
    time_scale?: "s" | "m" | "d" | "h" | undefined;
} & {
    field: string;
    operation: "sum";
    empty_as_null: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
    time_scale?: "s" | "m" | "d" | "h" | undefined;
} & {
    field: string;
    operation: "last_value";
    sort_by: string;
    show_array_values: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
    time_scale?: "s" | "m" | "d" | "h" | undefined;
} & {
    field: string;
    operation: "percentile";
    percentile: number;
}> | Readonly<{
    filter?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
    time_scale?: "s" | "m" | "d" | "h" | undefined;
} & {
    field: string;
    operation: "percentile_rank";
    rank: number;
}>>;
export declare const differencesOperationSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<{
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined>;
}, "filter" | "reduced_time_range" | "time_shift" | "time_scale"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
    time_scale: import("@kbn/config-schema").Type<"s" | "m" | "d" | "h" | undefined>;
}, "operation" | "of"> & {
    operation: import("@kbn/config-schema").Type<"differences">;
    of: import("@kbn/config-schema").Type<Readonly<{
        field?: string | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "max" | "min" | "median" | "average" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "last_value";
        sort_by: string;
        show_array_values: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "percentile";
        percentile: number;
    }> | Readonly<{
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "percentile_rank";
        rank: number;
    }>>;
}>;
export declare const movingAverageOperationSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<{
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined>;
}, "filter" | "reduced_time_range" | "time_shift" | "time_scale"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
    time_scale: import("@kbn/config-schema").Type<"s" | "m" | "d" | "h" | undefined>;
}, "operation" | "window" | "of"> & {
    operation: import("@kbn/config-schema").Type<"moving_average">;
    window: import("@kbn/config-schema").Type<number>;
    of: import("@kbn/config-schema").Type<Readonly<{
        field?: string | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "max" | "min" | "median" | "average" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "last_value";
        sort_by: string;
        show_array_values: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "percentile";
        percentile: number;
    }> | Readonly<{
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "percentile_rank";
        rank: number;
    }>>;
}>;
export declare const cumulativeSumOperationSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<Omit<{
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined>;
}, "filter" | "reduced_time_range" | "time_shift" | "time_scale"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
    time_scale: import("@kbn/config-schema").Type<"s" | "m" | "d" | "h" | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"cumulative_sum">;
}>;
export declare const counterRateOperationSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<Omit<{
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined>;
}, "filter" | "reduced_time_range" | "time_shift" | "time_scale"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
    time_scale: import("@kbn/config-schema").Type<"s" | "m" | "d" | "h" | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"counter_rate">;
}>;
export declare const metricOperationDefinitionSchema: import("@kbn/config-schema").Type<Readonly<{
    field?: string | undefined;
    filter?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
    time_scale?: "s" | "m" | "d" | "h" | undefined;
} & {
    operation: "count";
    empty_as_null: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
    time_scale?: "s" | "m" | "d" | "h" | undefined;
} & {
    field: string;
    operation: "unique_count";
    empty_as_null: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
    time_scale?: "s" | "m" | "d" | "h" | undefined;
} & {
    field: string;
    operation: "max" | "min" | "median" | "average" | "standard_deviation";
}> | Readonly<{
    filter?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
    time_scale?: "s" | "m" | "d" | "h" | undefined;
} & {
    field: string;
    operation: "sum";
    empty_as_null: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
    time_scale?: "s" | "m" | "d" | "h" | undefined;
} & {
    field: string;
    operation: "last_value";
    sort_by: string;
    show_array_values: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
    time_scale?: "s" | "m" | "d" | "h" | undefined;
} & {
    field: string;
    operation: "percentile";
    percentile: number;
}> | Readonly<{
    filter?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
    time_scale?: "s" | "m" | "d" | "h" | undefined;
} & {
    field: string;
    operation: "percentile_rank";
    rank: number;
}> | Readonly<{
    filter?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
    reduced_time_range?: string | undefined;
    time_scale?: "s" | "m" | "d" | "h" | undefined;
} & {
    operation: "formula";
    formula: string;
}> | Readonly<{
    filter?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
    time_scale?: "s" | "m" | "d" | "h" | undefined;
} & {
    operation: "differences";
    of: Readonly<{
        field?: string | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "max" | "min" | "median" | "average" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "last_value";
        sort_by: string;
        show_array_values: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "percentile";
        percentile: number;
    }> | Readonly<{
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "percentile_rank";
        rank: number;
    }>;
}> | Readonly<{
    filter?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
    time_scale?: "s" | "m" | "d" | "h" | undefined;
} & {
    operation: "moving_average";
    window: number;
    of: Readonly<{
        field?: string | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "max" | "min" | "median" | "average" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "last_value";
        sort_by: string;
        show_array_values: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "percentile";
        percentile: number;
    }> | Readonly<{
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        label?: string | undefined;
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
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            pattern: string;
            type: "custom";
        }> | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "percentile_rank";
        rank: number;
    }>;
}> | Readonly<{
    filter?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
    time_scale?: "s" | "m" | "d" | "h" | undefined;
} & {
    field: string;
    operation: "cumulative_sum";
}> | Readonly<{
    filter?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
    time_scale?: "s" | "m" | "d" | "h" | undefined;
} & {
    field: string;
    operation: "counter_rate";
}> | Readonly<{
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
} & {
    value: number;
    operation: "static_value";
}>>;
export type LensApiAllMetricOperations = TypeOf<typeof metricOperationDefinitionSchema>;
export declare const fieldMetricOrFormulaOperationDefinitionSchema: import("@kbn/config-schema").Type<Readonly<{
    field?: string | undefined;
    filter?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
    time_scale?: "s" | "m" | "d" | "h" | undefined;
} & {
    operation: "count";
    empty_as_null: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
    time_scale?: "s" | "m" | "d" | "h" | undefined;
} & {
    field: string;
    operation: "unique_count";
    empty_as_null: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
    time_scale?: "s" | "m" | "d" | "h" | undefined;
} & {
    field: string;
    operation: "max" | "min" | "median" | "average" | "standard_deviation";
}> | Readonly<{
    filter?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
    time_scale?: "s" | "m" | "d" | "h" | undefined;
} & {
    field: string;
    operation: "sum";
    empty_as_null: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
    time_scale?: "s" | "m" | "d" | "h" | undefined;
} & {
    field: string;
    operation: "last_value";
    sort_by: string;
    show_array_values: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
    time_scale?: "s" | "m" | "d" | "h" | undefined;
} & {
    field: string;
    operation: "percentile";
    percentile: number;
}> | Readonly<{
    filter?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
    time_scale?: "s" | "m" | "d" | "h" | undefined;
} & {
    field: string;
    operation: "percentile_rank";
    rank: number;
}> | Readonly<{
    filter?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    label?: string | undefined;
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
        type: "duration";
        from: string;
        to: string;
    }> | Readonly<{} & {
        pattern: string;
        type: "custom";
    }> | undefined;
    reduced_time_range?: string | undefined;
    time_scale?: "s" | "m" | "d" | "h" | undefined;
} & {
    operation: "formula";
    formula: string;
}>>;
export type LensApiReferableMetricOperations = LensApiCountMetricOperation | LensApiUniqueCountMetricOperation | LensApiMetricOperation | LensApiSumMetricOperation | LensApiLastValueOperation | LensApiPercentileOperation | LensApiPercentileRanksOperation;
export type LensApiFieldMetricOperations = TypeOf<typeof fieldMetricOperationsSchema>;
export type LensApiCountMetricOperation = TypeOf<typeof countMetricOperationSchema>;
export type LensApiUniqueCountMetricOperation = TypeOf<typeof uniqueCountMetricOperationSchema>;
export type LensApiMetricOperation = TypeOf<typeof metricOperationSchema>;
export type LensApiSumMetricOperation = TypeOf<typeof sumMetricOperationSchema>;
export type LensApiLastValueOperation = TypeOf<typeof lastValueOperationSchema>;
export type LensApiPercentileOperation = TypeOf<typeof percentileOperationSchema>;
export type LensApiPercentileRanksOperation = TypeOf<typeof percentileRanksOperationSchema>;
export type LensApiDifferencesOperation = TypeOf<typeof differencesOperationSchema>;
export type LensApiMovingAverageOperation = TypeOf<typeof movingAverageOperationSchema>;
export type LensApiCumulativeSumOperation = TypeOf<typeof cumulativeSumOperationSchema>;
export type LensApiCounterRateOperation = TypeOf<typeof counterRateOperationSchema>;
export type LensApiFormulaOperation = TypeOf<typeof formulaOperationDefinitionSchema>;
export type LensApiStaticValueOperation = TypeOf<typeof staticOperationDefinitionSchema>;
export type LensApiFieldMetricOrFormulaOperation = LensApiFieldMetricOperations | LensApiFormulaOperation;
export type LensApiAllMetricOrFormulaOperations = LensApiFieldMetricOperations | LensApiFormulaOperation | LensApiDifferencesOperation | LensApiMovingAverageOperation | LensApiCumulativeSumOperation | LensApiCounterRateOperation;
