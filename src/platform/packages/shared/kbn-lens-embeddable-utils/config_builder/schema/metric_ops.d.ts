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
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}>;
export declare const METRIC_OP_TITLES: {
    readonly static: "Static Operation Definition";
    readonly formula: "Formula Operation";
    readonly count: "Count Metric Operation";
    readonly uniqueCount: "Unique Count Metric Operation";
    readonly stats: "Stats Metric Operation";
    readonly sum: "Sum Metric Operation";
    readonly lastValue: "Last Value Operation";
    readonly percentile: "Percentile Operation";
    readonly percentileRanks: "Percentile Ranks Operation";
    readonly differences: "Differences Operation";
    readonly movingAverage: "Moving Average Operation";
    readonly cumulativeSum: "Cumulative Sum Operation";
    readonly counterRate: "Counter Rate Operation";
};
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
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
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
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "formula" | "operation" | "time_scale" | "reduced_time_range"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    formula: import("@kbn/config-schema").Type<string>;
    operation: import("@kbn/config-schema").Type<"formula">;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const esqlColumnSchema: import("@kbn/config-schema").ObjectType<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    column: import("@kbn/config-schema").Type<string>;
}>;
export declare const esqlColumnWithFormatSchema: import("@kbn/config-schema").ObjectType<Omit<{
    label: import("@kbn/config-schema").Type<string | undefined>;
    column: import("@kbn/config-schema").Type<string>;
}, "format"> & {
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
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
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
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
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
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
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
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
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
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"min" | "max" | "average" | "median" | "standard_deviation">;
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
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
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
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation" | "time_field" | "multi_value"> & {
    operation: import("@kbn/config-schema").Type<"last_value">;
    time_field: import("@kbn/config-schema").Type<string>;
    multi_value: import("@kbn/config-schema").Type<boolean>;
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
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "percentile" | "operation"> & {
    percentile: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile">;
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
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "rank" | "operation"> & {
    rank: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"percentile_rank">;
}>;
export declare const fieldMetricOperationsSchema: import("@kbn/config-schema").Type<Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    field?: string | undefined;
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    operation: "count";
    empty_as_null: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    field: string;
    operation: "unique_count";
    empty_as_null: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    field: string;
    operation: "min" | "max" | "average" | "median" | "standard_deviation";
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    field: string;
    operation: "sum";
    empty_as_null: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    field: string;
    operation: "last_value";
    time_field: string;
    multi_value: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    field: string;
    percentile: number;
    operation: "percentile";
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    field: string;
    rank: number;
    operation: "percentile_rank";
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
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    operation: import("@kbn/config-schema").Type<"differences">;
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
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "of" | "window" | "operation"> & {
    of: import("@kbn/config-schema").Type<Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>>;
    window: import("@kbn/config-schema").Type<number>;
    operation: import("@kbn/config-schema").Type<"moving_average">;
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
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
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
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined>;
}, "filter" | "time_scale" | "reduced_time_range" | "time_shift"> & {
    filter: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    time_scale: import("@kbn/config-schema").Type<"d" | "h" | "m" | "s" | undefined>;
    reduced_time_range: import("@kbn/config-schema").Type<string | undefined>;
    time_shift: import("@kbn/config-schema").Type<string | undefined>;
}, "field"> & {
    field: import("@kbn/config-schema").Type<string>;
}, "operation"> & {
    operation: import("@kbn/config-schema").Type<"counter_rate">;
}>;
export declare const metricOperationDefinitionSchema: import("@kbn/config-schema").Type<Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    field?: string | undefined;
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    operation: "count";
    empty_as_null: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    field: string;
    operation: "unique_count";
    empty_as_null: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    field: string;
    operation: "min" | "max" | "average" | "median" | "standard_deviation";
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    field: string;
    operation: "sum";
    empty_as_null: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    field: string;
    operation: "last_value";
    time_field: string;
    multi_value: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    field: string;
    percentile: number;
    operation: "percentile";
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    field: string;
    rank: number;
    operation: "percentile_rank";
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
} & {
    formula: string;
    operation: "formula";
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    of: Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>;
    operation: "differences";
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    of: Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        field?: string | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
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
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }>;
    window: number;
    operation: "moving_average";
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    field: string;
    operation: "cumulative_sum";
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    field: string;
    operation: "counter_rate";
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
    value: number;
    operation: "static_value";
}>>;
export type LensApiAllMetricOperations = TypeOf<typeof metricOperationDefinitionSchema>;
export declare const fieldMetricOrFormulaOperationDefinitionSchema: import("@kbn/config-schema").Type<Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    field?: string | undefined;
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    operation: "count";
    empty_as_null: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    field: string;
    operation: "unique_count";
    empty_as_null: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    field: string;
    operation: "min" | "max" | "average" | "median" | "standard_deviation";
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    field: string;
    operation: "sum";
    empty_as_null: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    field: string;
    operation: "last_value";
    time_field: string;
    multi_value: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    field: string;
    percentile: number;
    operation: "percentile";
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    field: string;
    rank: number;
    operation: "percentile_rank";
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
} & {
    formula: string;
    operation: "formula";
}>>;
export declare const fieldMetricOrStaticOrFormulaOperationDefinitionSchema: import("@kbn/config-schema").Type<Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    field?: string | undefined;
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    operation: "count";
    empty_as_null: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    field: string;
    operation: "unique_count";
    empty_as_null: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    field: string;
    operation: "min" | "max" | "average" | "median" | "standard_deviation";
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    field: string;
    operation: "sum";
    empty_as_null: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    field: string;
    operation: "last_value";
    time_field: string;
    multi_value: boolean;
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    field: string;
    percentile: number;
    operation: "percentile";
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
    time_shift?: string | undefined;
} & {
    field: string;
    rank: number;
    operation: "percentile_rank";
}> | Readonly<{
    filter?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    time_scale?: "d" | "h" | "m" | "s" | undefined;
    reduced_time_range?: string | undefined;
} & {
    formula: string;
    operation: "formula";
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
    value: number;
    operation: "static_value";
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
export type LensApiFieldMetricOrStaticOrFormulaOperation = LensApiFieldMetricOperations | LensApiStaticValueOperation | LensApiFormulaOperation;
export type LensApiAllMetricOrFormulaOperations = LensApiFieldMetricOperations | LensApiFormulaOperation | LensApiDifferencesOperation | LensApiMovingAverageOperation | LensApiCumulativeSumOperation | LensApiCounterRateOperation;
export type LensApiESQLColumn = TypeOf<typeof esqlColumnSchema>;
export type LensApiESQLColumnWithFormat = TypeOf<typeof esqlColumnWithFormatSchema>;
