import type { TypeOf } from '@kbn/config-schema';
export declare const treemapConfigSchemaNoESQL: import("@kbn/config-schema").ObjectType<{
    styling: import("@kbn/config-schema").Type<Readonly<{
        values?: Readonly<{
            visible?: boolean | undefined;
            mode?: "absolute" | "percentage" | undefined;
            percent_decimals?: number | undefined;
        } & {}> | undefined;
        labels?: Readonly<{
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
    /**
     * Primary value configuration, must define operation. Supports field-based operations (count, unique count, metrics, sum, last value, percentile, percentile ranks), reference-based operations (differences, moving average, cumulative sum, counter rate), and formula-like operations (static value, formula).
     */
    metrics: import("@kbn/config-schema").Type<(Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        field?: string | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "max" | "min" | "median" | "average" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "differences";
        of: Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            field?: string | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "max" | "min" | "median" | "average" | "standard_deviation";
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "last_value";
            time_field: string;
            multi_value: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            percentile: number;
            operation: "percentile";
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            rank: number;
            operation: "percentile_rank";
        }>;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        window: number;
        operation: "moving_average";
        of: Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            field?: string | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "max" | "min" | "median" | "average" | "standard_deviation";
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "last_value";
            time_field: string;
            multi_value: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            percentile: number;
            operation: "percentile";
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            rank: number;
            operation: "percentile_rank";
        }>;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        field?: string | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "cumulative_sum";
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "counter_rate";
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
    } & {
        operation: "formula";
        formula: string;
    }>)[]>;
    /**
     * Configure how to break down the metric (e.g. show one metric per term). Supports date histogram, terms, histogram, ranges, and filters operations.
     */
    group_by: import("@kbn/config-schema").Type<(Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "categorical";
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    value: string;
                    type: "color_code";
                }>;
            }>[];
            palette: string;
        }> | Readonly<{
            sort?: "asc" | "desc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "gradient";
            palette: string;
        }> | undefined;
        label?: string | undefined;
        drop_partial_intervals?: boolean | undefined;
        collapse_by?: "avg" | "max" | "min" | "sum" | undefined;
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
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "categorical";
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    value: string;
                    type: "color_code";
                }>;
            }>[];
            palette: string;
        }> | Readonly<{
            sort?: "asc" | "desc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "gradient";
            palette: string;
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        increase_accuracy?: boolean | undefined;
        excludes?: Readonly<{
            as_regex?: boolean | undefined;
        } & {
            values: string[];
        }> | undefined;
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
            operation: "max" | "min" | "sum" | "median" | "average" | "last_value" | "unique_count" | "standard_deviation";
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
        collapse_by?: "avg" | "max" | "min" | "sum" | undefined;
    } & {
        fields: string[];
        limit: number;
        operation: "terms";
    }> | Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "categorical";
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    value: string;
                    type: "color_code";
                }>;
            }>[];
            palette: string;
        }> | Readonly<{
            sort?: "asc" | "desc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "gradient";
            palette: string;
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        collapse_by?: "avg" | "max" | "min" | "sum" | undefined;
    } & {
        field: string;
        operation: "histogram";
        include_empty_rows: boolean;
        granularity: number | "auto";
    }> | Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "categorical";
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    value: string;
                    type: "color_code";
                }>;
            }>[];
            palette: string;
        }> | Readonly<{
            sort?: "asc" | "desc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "gradient";
            palette: string;
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        collapse_by?: "avg" | "max" | "min" | "sum" | undefined;
    } & {
        field: string;
        ranges: Readonly<{
            gt?: number | undefined;
            lte?: number | undefined;
            label?: string | undefined;
        } & {}>[];
        operation: "range";
    }> | Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "categorical";
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    value: string;
                    type: "color_code";
                }>;
            }>[];
            palette: string;
        }> | Readonly<{
            sort?: "asc" | "desc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "gradient";
            palette: string;
        }> | undefined;
        label?: string | undefined;
        collapse_by?: "avg" | "max" | "min" | "sum" | undefined;
    } & {
        filters: Readonly<{
            label?: string | undefined;
        } & {
            filter: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }>;
        }>[];
        operation: "filters";
    }>)[] | undefined>;
    legend: import("@kbn/config-schema").Type<Readonly<{
        nested?: boolean | undefined;
        size?: "s" | "m" | "l" | "xl" | "auto" | undefined;
        position?: "top" | "bottom" | "left" | "right" | undefined;
        visibility?: "hidden" | "visible" | "auto" | undefined;
        truncate_after_lines?: number | undefined;
    } & {}> | undefined>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        language: "lucene" | "kql";
        expression: string;
    }> | undefined>;
    data_source: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<{
        type: import("@kbn/config-schema").Type<"data_view_reference">;
        ref_id: import("@kbn/config-schema").Type<string>;
    } | {
        name: import("@kbn/config-schema").Type<string | undefined>;
        type: import("@kbn/config-schema").Type<"data_view_spec">;
        index_pattern: import("@kbn/config-schema").Type<string>;
        time_field: import("@kbn/config-schema").Type<string | undefined>;
        allow_hidden_indices: import("@kbn/config-schema").Type<boolean | undefined>;
        field_settings: import("@kbn/config-schema").Type<Record<string, Readonly<{
            format?: Readonly<{
                params?: any;
            } & {
                type: string;
            }> | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
        } & {}> | Readonly<{
            script?: string | undefined;
            format?: Readonly<{
                params?: any;
            } & {
                type: string;
            }> | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
        } & {
            type: "boolean" | "ip" | "date" | "geo_point" | "double" | "keyword" | "long";
        }> | Readonly<{
            script?: string | undefined;
        } & {
            type: "composite";
            fields: Record<string, Readonly<{
                format?: Readonly<{
                    params?: any;
                } & {
                    type: string;
                }> | undefined;
                custom_label?: string | undefined;
                custom_description?: string | undefined;
            } & {
                type: "boolean" | "ip" | "date" | "geo_point" | "double" | "keyword" | "long";
            }>>;
        }>> | undefined>;
    }>>;
    ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
    sampling: import("@kbn/config-schema").Type<number>;
    title: import("@kbn/config-schema").Type<string | undefined>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    filters: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "condition"> & {
        type: import("@kbn/config-schema").Type<"condition">;
        condition: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").Type<string | number | boolean>;
            operator: import("@kbn/config-schema").Type<"is">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
            operator: import("@kbn/config-schema").Type<"is_one_of">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").ObjectType<{
                gte: import("@kbn/config-schema").Type<string | number | undefined>;
                lte: import("@kbn/config-schema").Type<string | number | undefined>;
                gt: import("@kbn/config-schema").Type<string | number | undefined>;
                lt: import("@kbn/config-schema").Type<string | number | undefined>;
                format: import("@kbn/config-schema").Type<string | undefined>;
            }>;
            operator: import("@kbn/config-schema").Type<"range">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "operator"> & {
            operator: import("@kbn/config-schema").Type<"exists">;
        })>>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "group"> & {
        type: import("@kbn/config-schema").Type<"group">;
        group: import("@kbn/config-schema").ObjectType<{
            operator: import("@kbn/config-schema").Type<"and" | "or">;
            conditions: import("@kbn/config-schema").Type<(import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").Type<string | number | boolean>;
                operator: import("@kbn/config-schema").Type<"is">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                operator: import("@kbn/config-schema").Type<"is_one_of">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").ObjectType<{
                    gte: import("@kbn/config-schema").Type<string | number | undefined>;
                    lte: import("@kbn/config-schema").Type<string | number | undefined>;
                    gt: import("@kbn/config-schema").Type<string | number | undefined>;
                    lt: import("@kbn/config-schema").Type<string | number | undefined>;
                    format: import("@kbn/config-schema").Type<string | undefined>;
                }>;
                operator: import("@kbn/config-schema").Type<"range">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "operator"> & {
                operator: import("@kbn/config-schema").Type<"exists">;
            })> | import("@kbn/as-code-filters-schema").AsCodeGroupFilterRecursive)[]>;
        }>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "params" | "field" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"dsl">;
        params: import("@kbn/config-schema").Type<any>;
        field: import("@kbn/config-schema").Type<string | undefined>;
        dsl: import("@kbn/config-schema").Type<Record<string, any>>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"spatial">;
        dsl: import("@kbn/config-schema").Type<Record<string, any>>;
    })>[] | undefined>;
    type: import("@kbn/config-schema").Type<"treemap">;
}>;
export declare const treemapConfigSchemaESQL: import("@kbn/config-schema").ObjectType<{
    styling: import("@kbn/config-schema").Type<Readonly<{
        values?: Readonly<{
            visible?: boolean | undefined;
            mode?: "absolute" | "percentage" | undefined;
            percent_decimals?: number | undefined;
        } & {}> | undefined;
        labels?: Readonly<{
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
    /**
     * Primary value configuration, must define operation. In ES|QL mode, uses column-based configuration.
     */
    metrics: import("@kbn/config-schema").Type<Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
    } & {
        column: string;
    }>[]>;
    /**
     * Configure how to break down the metric (e.g. show one metric per term). In ES|QL mode, uses column-based configuration.
     */
    group_by: import("@kbn/config-schema").Type<Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "categorical";
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    value: string;
                    type: "color_code";
                }>;
            }>[];
            palette: string;
        }> | Readonly<{
            sort?: "asc" | "desc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "gradient";
            palette: string;
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        collapse_by?: "avg" | "max" | "min" | "sum" | undefined;
    } & {
        column: string;
    }>[] | undefined>;
    legend: import("@kbn/config-schema").Type<Readonly<{
        nested?: boolean | undefined;
        size?: "s" | "m" | "l" | "xl" | "auto" | undefined;
        position?: "top" | "bottom" | "left" | "right" | undefined;
        visibility?: "hidden" | "visible" | "auto" | undefined;
        truncate_after_lines?: number | undefined;
    } & {}> | undefined>;
    data_source: import("@kbn/config-schema").ObjectType<{
        type: import("@kbn/config-schema").Type<"esql">;
        query: import("@kbn/config-schema").Type<string>;
    }>;
    ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
    sampling: import("@kbn/config-schema").Type<number>;
    title: import("@kbn/config-schema").Type<string | undefined>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    filters: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "condition"> & {
        type: import("@kbn/config-schema").Type<"condition">;
        condition: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").Type<string | number | boolean>;
            operator: import("@kbn/config-schema").Type<"is">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
            operator: import("@kbn/config-schema").Type<"is_one_of">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").ObjectType<{
                gte: import("@kbn/config-schema").Type<string | number | undefined>;
                lte: import("@kbn/config-schema").Type<string | number | undefined>;
                gt: import("@kbn/config-schema").Type<string | number | undefined>;
                lt: import("@kbn/config-schema").Type<string | number | undefined>;
                format: import("@kbn/config-schema").Type<string | undefined>;
            }>;
            operator: import("@kbn/config-schema").Type<"range">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "operator"> & {
            operator: import("@kbn/config-schema").Type<"exists">;
        })>>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "group"> & {
        type: import("@kbn/config-schema").Type<"group">;
        group: import("@kbn/config-schema").ObjectType<{
            operator: import("@kbn/config-schema").Type<"and" | "or">;
            conditions: import("@kbn/config-schema").Type<(import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").Type<string | number | boolean>;
                operator: import("@kbn/config-schema").Type<"is">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                operator: import("@kbn/config-schema").Type<"is_one_of">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").ObjectType<{
                    gte: import("@kbn/config-schema").Type<string | number | undefined>;
                    lte: import("@kbn/config-schema").Type<string | number | undefined>;
                    gt: import("@kbn/config-schema").Type<string | number | undefined>;
                    lt: import("@kbn/config-schema").Type<string | number | undefined>;
                    format: import("@kbn/config-schema").Type<string | undefined>;
                }>;
                operator: import("@kbn/config-schema").Type<"range">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "operator"> & {
                operator: import("@kbn/config-schema").Type<"exists">;
            })> | import("@kbn/as-code-filters-schema").AsCodeGroupFilterRecursive)[]>;
        }>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "params" | "field" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"dsl">;
        params: import("@kbn/config-schema").Type<any>;
        field: import("@kbn/config-schema").Type<string | undefined>;
        dsl: import("@kbn/config-schema").Type<Record<string, any>>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"spatial">;
        dsl: import("@kbn/config-schema").Type<Record<string, any>>;
    })>[] | undefined>;
    type: import("@kbn/config-schema").Type<"treemap">;
}>;
export declare const treemapConfigSchema: import("./utils/object_union").ObjectUnionType<[import("@kbn/config-schema").ObjectType<{
    styling: import("@kbn/config-schema").Type<Readonly<{
        values?: Readonly<{
            visible?: boolean | undefined;
            mode?: "absolute" | "percentage" | undefined;
            percent_decimals?: number | undefined;
        } & {}> | undefined;
        labels?: Readonly<{
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
    /**
     * Primary value configuration, must define operation. Supports field-based operations (count, unique count, metrics, sum, last value, percentile, percentile ranks), reference-based operations (differences, moving average, cumulative sum, counter rate), and formula-like operations (static value, formula).
     */
    metrics: import("@kbn/config-schema").Type<(Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        field?: string | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "max" | "min" | "median" | "average" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "differences";
        of: Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            field?: string | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "max" | "min" | "median" | "average" | "standard_deviation";
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "last_value";
            time_field: string;
            multi_value: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            percentile: number;
            operation: "percentile";
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            rank: number;
            operation: "percentile_rank";
        }>;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        window: number;
        operation: "moving_average";
        of: Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            field?: string | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "max" | "min" | "median" | "average" | "standard_deviation";
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "last_value";
            time_field: string;
            multi_value: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            percentile: number;
            operation: "percentile";
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            rank: number;
            operation: "percentile_rank";
        }>;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        field?: string | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "cumulative_sum";
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "counter_rate";
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
    } & {
        operation: "formula";
        formula: string;
    }>)[]>;
    /**
     * Configure how to break down the metric (e.g. show one metric per term). Supports date histogram, terms, histogram, ranges, and filters operations.
     */
    group_by: import("@kbn/config-schema").Type<(Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "categorical";
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    value: string;
                    type: "color_code";
                }>;
            }>[];
            palette: string;
        }> | Readonly<{
            sort?: "asc" | "desc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "gradient";
            palette: string;
        }> | undefined;
        label?: string | undefined;
        drop_partial_intervals?: boolean | undefined;
        collapse_by?: "avg" | "max" | "min" | "sum" | undefined;
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
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "categorical";
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    value: string;
                    type: "color_code";
                }>;
            }>[];
            palette: string;
        }> | Readonly<{
            sort?: "asc" | "desc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "gradient";
            palette: string;
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        increase_accuracy?: boolean | undefined;
        excludes?: Readonly<{
            as_regex?: boolean | undefined;
        } & {
            values: string[];
        }> | undefined;
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
            operation: "max" | "min" | "sum" | "median" | "average" | "last_value" | "unique_count" | "standard_deviation";
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
        collapse_by?: "avg" | "max" | "min" | "sum" | undefined;
    } & {
        fields: string[];
        limit: number;
        operation: "terms";
    }> | Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "categorical";
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    value: string;
                    type: "color_code";
                }>;
            }>[];
            palette: string;
        }> | Readonly<{
            sort?: "asc" | "desc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "gradient";
            palette: string;
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        collapse_by?: "avg" | "max" | "min" | "sum" | undefined;
    } & {
        field: string;
        operation: "histogram";
        include_empty_rows: boolean;
        granularity: number | "auto";
    }> | Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "categorical";
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    value: string;
                    type: "color_code";
                }>;
            }>[];
            palette: string;
        }> | Readonly<{
            sort?: "asc" | "desc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "gradient";
            palette: string;
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        collapse_by?: "avg" | "max" | "min" | "sum" | undefined;
    } & {
        field: string;
        ranges: Readonly<{
            gt?: number | undefined;
            lte?: number | undefined;
            label?: string | undefined;
        } & {}>[];
        operation: "range";
    }> | Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "categorical";
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    value: string;
                    type: "color_code";
                }>;
            }>[];
            palette: string;
        }> | Readonly<{
            sort?: "asc" | "desc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "gradient";
            palette: string;
        }> | undefined;
        label?: string | undefined;
        collapse_by?: "avg" | "max" | "min" | "sum" | undefined;
    } & {
        filters: Readonly<{
            label?: string | undefined;
        } & {
            filter: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }>;
        }>[];
        operation: "filters";
    }>)[] | undefined>;
    legend: import("@kbn/config-schema").Type<Readonly<{
        nested?: boolean | undefined;
        size?: "s" | "m" | "l" | "xl" | "auto" | undefined;
        position?: "top" | "bottom" | "left" | "right" | undefined;
        visibility?: "hidden" | "visible" | "auto" | undefined;
        truncate_after_lines?: number | undefined;
    } & {}> | undefined>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        language: "lucene" | "kql";
        expression: string;
    }> | undefined>;
    data_source: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<{
        type: import("@kbn/config-schema").Type<"data_view_reference">;
        ref_id: import("@kbn/config-schema").Type<string>;
    } | {
        name: import("@kbn/config-schema").Type<string | undefined>;
        type: import("@kbn/config-schema").Type<"data_view_spec">;
        index_pattern: import("@kbn/config-schema").Type<string>;
        time_field: import("@kbn/config-schema").Type<string | undefined>;
        allow_hidden_indices: import("@kbn/config-schema").Type<boolean | undefined>;
        field_settings: import("@kbn/config-schema").Type<Record<string, Readonly<{
            format?: Readonly<{
                params?: any;
            } & {
                type: string;
            }> | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
        } & {}> | Readonly<{
            script?: string | undefined;
            format?: Readonly<{
                params?: any;
            } & {
                type: string;
            }> | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
        } & {
            type: "boolean" | "ip" | "date" | "geo_point" | "double" | "keyword" | "long";
        }> | Readonly<{
            script?: string | undefined;
        } & {
            type: "composite";
            fields: Record<string, Readonly<{
                format?: Readonly<{
                    params?: any;
                } & {
                    type: string;
                }> | undefined;
                custom_label?: string | undefined;
                custom_description?: string | undefined;
            } & {
                type: "boolean" | "ip" | "date" | "geo_point" | "double" | "keyword" | "long";
            }>>;
        }>> | undefined>;
    }>>;
    ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
    sampling: import("@kbn/config-schema").Type<number>;
    title: import("@kbn/config-schema").Type<string | undefined>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    filters: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "condition"> & {
        type: import("@kbn/config-schema").Type<"condition">;
        condition: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").Type<string | number | boolean>;
            operator: import("@kbn/config-schema").Type<"is">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
            operator: import("@kbn/config-schema").Type<"is_one_of">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").ObjectType<{
                gte: import("@kbn/config-schema").Type<string | number | undefined>;
                lte: import("@kbn/config-schema").Type<string | number | undefined>;
                gt: import("@kbn/config-schema").Type<string | number | undefined>;
                lt: import("@kbn/config-schema").Type<string | number | undefined>;
                format: import("@kbn/config-schema").Type<string | undefined>;
            }>;
            operator: import("@kbn/config-schema").Type<"range">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "operator"> & {
            operator: import("@kbn/config-schema").Type<"exists">;
        })>>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "group"> & {
        type: import("@kbn/config-schema").Type<"group">;
        group: import("@kbn/config-schema").ObjectType<{
            operator: import("@kbn/config-schema").Type<"and" | "or">;
            conditions: import("@kbn/config-schema").Type<(import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").Type<string | number | boolean>;
                operator: import("@kbn/config-schema").Type<"is">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                operator: import("@kbn/config-schema").Type<"is_one_of">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").ObjectType<{
                    gte: import("@kbn/config-schema").Type<string | number | undefined>;
                    lte: import("@kbn/config-schema").Type<string | number | undefined>;
                    gt: import("@kbn/config-schema").Type<string | number | undefined>;
                    lt: import("@kbn/config-schema").Type<string | number | undefined>;
                    format: import("@kbn/config-schema").Type<string | undefined>;
                }>;
                operator: import("@kbn/config-schema").Type<"range">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "operator"> & {
                operator: import("@kbn/config-schema").Type<"exists">;
            })> | import("@kbn/as-code-filters-schema").AsCodeGroupFilterRecursive)[]>;
        }>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "params" | "field" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"dsl">;
        params: import("@kbn/config-schema").Type<any>;
        field: import("@kbn/config-schema").Type<string | undefined>;
        dsl: import("@kbn/config-schema").Type<Record<string, any>>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"spatial">;
        dsl: import("@kbn/config-schema").Type<Record<string, any>>;
    })>[] | undefined>;
    type: import("@kbn/config-schema").Type<"treemap">;
}>, import("@kbn/config-schema").ObjectType<{
    styling: import("@kbn/config-schema").Type<Readonly<{
        values?: Readonly<{
            visible?: boolean | undefined;
            mode?: "absolute" | "percentage" | undefined;
            percent_decimals?: number | undefined;
        } & {}> | undefined;
        labels?: Readonly<{
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
    /**
     * Primary value configuration, must define operation. In ES|QL mode, uses column-based configuration.
     */
    metrics: import("@kbn/config-schema").Type<Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
    } & {
        column: string;
    }>[]>;
    /**
     * Configure how to break down the metric (e.g. show one metric per term). In ES|QL mode, uses column-based configuration.
     */
    group_by: import("@kbn/config-schema").Type<Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "categorical";
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    value: string;
                    type: "color_code";
                }>;
            }>[];
            palette: string;
        }> | Readonly<{
            sort?: "asc" | "desc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "gradient";
            palette: string;
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        collapse_by?: "avg" | "max" | "min" | "sum" | undefined;
    } & {
        column: string;
    }>[] | undefined>;
    legend: import("@kbn/config-schema").Type<Readonly<{
        nested?: boolean | undefined;
        size?: "s" | "m" | "l" | "xl" | "auto" | undefined;
        position?: "top" | "bottom" | "left" | "right" | undefined;
        visibility?: "hidden" | "visible" | "auto" | undefined;
        truncate_after_lines?: number | undefined;
    } & {}> | undefined>;
    data_source: import("@kbn/config-schema").ObjectType<{
        type: import("@kbn/config-schema").Type<"esql">;
        query: import("@kbn/config-schema").Type<string>;
    }>;
    ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
    sampling: import("@kbn/config-schema").Type<number>;
    title: import("@kbn/config-schema").Type<string | undefined>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    filters: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "condition"> & {
        type: import("@kbn/config-schema").Type<"condition">;
        condition: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").Type<string | number | boolean>;
            operator: import("@kbn/config-schema").Type<"is">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
            operator: import("@kbn/config-schema").Type<"is_one_of">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").ObjectType<{
                gte: import("@kbn/config-schema").Type<string | number | undefined>;
                lte: import("@kbn/config-schema").Type<string | number | undefined>;
                gt: import("@kbn/config-schema").Type<string | number | undefined>;
                lt: import("@kbn/config-schema").Type<string | number | undefined>;
                format: import("@kbn/config-schema").Type<string | undefined>;
            }>;
            operator: import("@kbn/config-schema").Type<"range">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "operator"> & {
            operator: import("@kbn/config-schema").Type<"exists">;
        })>>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "group"> & {
        type: import("@kbn/config-schema").Type<"group">;
        group: import("@kbn/config-schema").ObjectType<{
            operator: import("@kbn/config-schema").Type<"and" | "or">;
            conditions: import("@kbn/config-schema").Type<(import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").Type<string | number | boolean>;
                operator: import("@kbn/config-schema").Type<"is">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                operator: import("@kbn/config-schema").Type<"is_one_of">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").ObjectType<{
                    gte: import("@kbn/config-schema").Type<string | number | undefined>;
                    lte: import("@kbn/config-schema").Type<string | number | undefined>;
                    gt: import("@kbn/config-schema").Type<string | number | undefined>;
                    lt: import("@kbn/config-schema").Type<string | number | undefined>;
                    format: import("@kbn/config-schema").Type<string | undefined>;
                }>;
                operator: import("@kbn/config-schema").Type<"range">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "operator"> & {
                operator: import("@kbn/config-schema").Type<"exists">;
            })> | import("@kbn/as-code-filters-schema").AsCodeGroupFilterRecursive)[]>;
        }>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "params" | "field" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"dsl">;
        params: import("@kbn/config-schema").Type<any>;
        field: import("@kbn/config-schema").Type<string | undefined>;
        dsl: import("@kbn/config-schema").Type<Record<string, any>>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"spatial">;
        dsl: import("@kbn/config-schema").Type<Record<string, any>>;
    })>[] | undefined>;
    type: import("@kbn/config-schema").Type<"treemap">;
}>], Readonly<{
    description?: string | undefined;
    title?: string | undefined;
    query?: Readonly<{} & {
        language: "lucene" | "kql";
        expression: string;
    }> | undefined;
    filters?: import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "condition"> & {
        type: import("@kbn/config-schema").Type<"condition">;
        condition: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").Type<string | number | boolean>;
            operator: import("@kbn/config-schema").Type<"is">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
            operator: import("@kbn/config-schema").Type<"is_one_of">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").ObjectType<{
                gte: import("@kbn/config-schema").Type<string | number | undefined>;
                lte: import("@kbn/config-schema").Type<string | number | undefined>;
                gt: import("@kbn/config-schema").Type<string | number | undefined>;
                lt: import("@kbn/config-schema").Type<string | number | undefined>;
                format: import("@kbn/config-schema").Type<string | undefined>;
            }>;
            operator: import("@kbn/config-schema").Type<"range">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "operator"> & {
            operator: import("@kbn/config-schema").Type<"exists">;
        })>>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "group"> & {
        type: import("@kbn/config-schema").Type<"group">;
        group: import("@kbn/config-schema").ObjectType<{
            operator: import("@kbn/config-schema").Type<"and" | "or">;
            conditions: import("@kbn/config-schema").Type<(import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").Type<string | number | boolean>;
                operator: import("@kbn/config-schema").Type<"is">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                operator: import("@kbn/config-schema").Type<"is_one_of">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").ObjectType<{
                    gte: import("@kbn/config-schema").Type<string | number | undefined>;
                    lte: import("@kbn/config-schema").Type<string | number | undefined>;
                    gt: import("@kbn/config-schema").Type<string | number | undefined>;
                    lt: import("@kbn/config-schema").Type<string | number | undefined>;
                    format: import("@kbn/config-schema").Type<string | undefined>;
                }>;
                operator: import("@kbn/config-schema").Type<"range">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "operator"> & {
                operator: import("@kbn/config-schema").Type<"exists">;
            })> | import("@kbn/as-code-filters-schema").AsCodeGroupFilterRecursive)[]>;
        }>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "params" | "field" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"dsl">;
        params: import("@kbn/config-schema").Type<any>;
        field: import("@kbn/config-schema").Type<string | undefined>;
        dsl: import("@kbn/config-schema").Type<Record<string, any>>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"spatial">;
        dsl: import("@kbn/config-schema").Type<Record<string, any>>;
    })>[] | undefined;
    legend?: Readonly<{
        nested?: boolean | undefined;
        size?: "s" | "m" | "l" | "xl" | "auto" | undefined;
        position?: "top" | "bottom" | "left" | "right" | undefined;
        visibility?: "hidden" | "visible" | "auto" | undefined;
        truncate_after_lines?: number | undefined;
    } & {}> | undefined;
    styling?: Readonly<{
        values?: Readonly<{
            visible?: boolean | undefined;
            mode?: "absolute" | "percentage" | undefined;
            percent_decimals?: number | undefined;
        } & {}> | undefined;
        labels?: Readonly<{
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | undefined;
    group_by?: (Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "categorical";
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    value: string;
                    type: "color_code";
                }>;
            }>[];
            palette: string;
        }> | Readonly<{
            sort?: "asc" | "desc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "gradient";
            palette: string;
        }> | undefined;
        label?: string | undefined;
        drop_partial_intervals?: boolean | undefined;
        collapse_by?: "avg" | "max" | "min" | "sum" | undefined;
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
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "categorical";
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    value: string;
                    type: "color_code";
                }>;
            }>[];
            palette: string;
        }> | Readonly<{
            sort?: "asc" | "desc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "gradient";
            palette: string;
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        increase_accuracy?: boolean | undefined;
        excludes?: Readonly<{
            as_regex?: boolean | undefined;
        } & {
            values: string[];
        }> | undefined;
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
            operation: "max" | "min" | "sum" | "median" | "average" | "last_value" | "unique_count" | "standard_deviation";
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
        collapse_by?: "avg" | "max" | "min" | "sum" | undefined;
    } & {
        fields: string[];
        limit: number;
        operation: "terms";
    }> | Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "categorical";
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    value: string;
                    type: "color_code";
                }>;
            }>[];
            palette: string;
        }> | Readonly<{
            sort?: "asc" | "desc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "gradient";
            palette: string;
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        collapse_by?: "avg" | "max" | "min" | "sum" | undefined;
    } & {
        field: string;
        operation: "histogram";
        include_empty_rows: boolean;
        granularity: number | "auto";
    }> | Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "categorical";
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    value: string;
                    type: "color_code";
                }>;
            }>[];
            palette: string;
        }> | Readonly<{
            sort?: "asc" | "desc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "gradient";
            palette: string;
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        collapse_by?: "avg" | "max" | "min" | "sum" | undefined;
    } & {
        field: string;
        ranges: Readonly<{
            gt?: number | undefined;
            lte?: number | undefined;
            label?: string | undefined;
        } & {}>[];
        operation: "range";
    }> | Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "categorical";
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    value: string;
                    type: "color_code";
                }>;
            }>[];
            palette: string;
        }> | Readonly<{
            sort?: "asc" | "desc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "gradient";
            palette: string;
        }> | undefined;
        label?: string | undefined;
        collapse_by?: "avg" | "max" | "min" | "sum" | undefined;
    } & {
        filters: Readonly<{
            label?: string | undefined;
        } & {
            filter: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }>;
        }>[];
        operation: "filters";
    }>)[] | undefined;
} & {
    type: "treemap";
    data_source: import("@kbn/config-schema/src/types").ObjectResultUnionType<{
        type: import("@kbn/config-schema").Type<"data_view_reference">;
        ref_id: import("@kbn/config-schema").Type<string>;
    } | {
        name: import("@kbn/config-schema").Type<string | undefined>;
        type: import("@kbn/config-schema").Type<"data_view_spec">;
        index_pattern: import("@kbn/config-schema").Type<string>;
        time_field: import("@kbn/config-schema").Type<string | undefined>;
        allow_hidden_indices: import("@kbn/config-schema").Type<boolean | undefined>;
        field_settings: import("@kbn/config-schema").Type<Record<string, Readonly<{
            format?: Readonly<{
                params?: any;
            } & {
                type: string;
            }> | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
        } & {}> | Readonly<{
            script?: string | undefined;
            format?: Readonly<{
                params?: any;
            } & {
                type: string;
            }> | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
        } & {
            type: "boolean" | "ip" | "date" | "geo_point" | "double" | "keyword" | "long";
        }> | Readonly<{
            script?: string | undefined;
        } & {
            type: "composite";
            fields: Record<string, Readonly<{
                format?: Readonly<{
                    params?: any;
                } & {
                    type: string;
                }> | undefined;
                custom_label?: string | undefined;
                custom_description?: string | undefined;
            } & {
                type: "boolean" | "ip" | "date" | "geo_point" | "double" | "keyword" | "long";
            }>>;
        }>> | undefined>;
    }>;
    metrics: (Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        field?: string | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "max" | "min" | "median" | "average" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "differences";
        of: Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            field?: string | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "max" | "min" | "median" | "average" | "standard_deviation";
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "last_value";
            time_field: string;
            multi_value: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            percentile: number;
            operation: "percentile";
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            rank: number;
            operation: "percentile_rank";
        }>;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        window: number;
        operation: "moving_average";
        of: Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            field?: string | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "max" | "min" | "median" | "average" | "standard_deviation";
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "last_value";
            time_field: string;
            multi_value: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            percentile: number;
            operation: "percentile";
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            label?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
                to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
                type: "duration";
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                from: string;
                to: string;
                type: "duration";
            }> | Readonly<{
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
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            rank: number;
            operation: "percentile_rank";
        }>;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        field?: string | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        operation: "cumulative_sum";
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "counter_rate";
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        reduced_time_range?: string | undefined;
    } & {
        operation: "formula";
        formula: string;
    }>)[];
    sampling: number;
    ignore_global_filters: boolean;
}> | Readonly<{
    description?: string | undefined;
    title?: string | undefined;
    filters?: import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "condition"> & {
        type: import("@kbn/config-schema").Type<"condition">;
        condition: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").Type<string | number | boolean>;
            operator: import("@kbn/config-schema").Type<"is">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
            operator: import("@kbn/config-schema").Type<"is_one_of">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: import("@kbn/config-schema").ObjectType<{
                gte: import("@kbn/config-schema").Type<string | number | undefined>;
                lte: import("@kbn/config-schema").Type<string | number | undefined>;
                gt: import("@kbn/config-schema").Type<string | number | undefined>;
                lt: import("@kbn/config-schema").Type<string | number | undefined>;
                format: import("@kbn/config-schema").Type<string | undefined>;
            }>;
            operator: import("@kbn/config-schema").Type<"range">;
        }) | (Omit<{
            field: import("@kbn/config-schema").Type<string>;
            negate: import("@kbn/config-schema").Type<boolean | undefined>;
        }, "operator"> & {
            operator: import("@kbn/config-schema").Type<"exists">;
        })>>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "group"> & {
        type: import("@kbn/config-schema").Type<"group">;
        group: import("@kbn/config-schema").ObjectType<{
            operator: import("@kbn/config-schema").Type<"and" | "or">;
            conditions: import("@kbn/config-schema").Type<(import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").Type<string | number | boolean>;
                operator: import("@kbn/config-schema").Type<"is">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").Type<number[] | string[] | boolean[]>;
                operator: import("@kbn/config-schema").Type<"is_one_of">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: import("@kbn/config-schema").ObjectType<{
                    gte: import("@kbn/config-schema").Type<string | number | undefined>;
                    lte: import("@kbn/config-schema").Type<string | number | undefined>;
                    gt: import("@kbn/config-schema").Type<string | number | undefined>;
                    lt: import("@kbn/config-schema").Type<string | number | undefined>;
                    format: import("@kbn/config-schema").Type<string | undefined>;
                }>;
                operator: import("@kbn/config-schema").Type<"range">;
            }) | (Omit<{
                field: import("@kbn/config-schema").Type<string>;
                negate: import("@kbn/config-schema").Type<boolean | undefined>;
            }, "operator"> & {
                operator: import("@kbn/config-schema").Type<"exists">;
            })> | import("@kbn/as-code-filters-schema").AsCodeGroupFilterRecursive)[]>;
        }>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "params" | "field" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"dsl">;
        params: import("@kbn/config-schema").Type<any>;
        field: import("@kbn/config-schema").Type<string | undefined>;
        dsl: import("@kbn/config-schema").Type<Record<string, any>>;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "type" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"spatial">;
        dsl: import("@kbn/config-schema").Type<Record<string, any>>;
    })>[] | undefined;
    legend?: Readonly<{
        nested?: boolean | undefined;
        size?: "s" | "m" | "l" | "xl" | "auto" | undefined;
        position?: "top" | "bottom" | "left" | "right" | undefined;
        visibility?: "hidden" | "visible" | "auto" | undefined;
        truncate_after_lines?: number | undefined;
    } & {}> | undefined;
    styling?: Readonly<{
        values?: Readonly<{
            visible?: boolean | undefined;
            mode?: "absolute" | "percentage" | undefined;
            percent_decimals?: number | undefined;
        } & {}> | undefined;
        labels?: Readonly<{
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | undefined;
    group_by?: Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "categorical";
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    value: string;
                    type: "color_code";
                }>;
            }>[];
            palette: string;
        }> | Readonly<{
            sort?: "asc" | "desc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    from: string | number;
                    to: string | number;
                    type: "range_key";
                    ranges: Readonly<{} & {
                        from: string | number;
                        to: string | number;
                        label: string;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                value: string;
                type: "color_code";
            }> | undefined;
        } & {
            mode: "gradient";
            palette: string;
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        collapse_by?: "avg" | "max" | "min" | "sum" | undefined;
    } & {
        column: string;
    }>[] | undefined;
} & {
    type: "treemap";
    data_source: Readonly<{} & {
        type: "esql";
        query: string;
    }>;
    metrics: Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            from: "min" | "s" | "y" | "ms" | "d" | "w" | "h" | "us" | "mo" | "ns" | "ps";
            to: "min" | "s" | "y" | "ms" | "auto" | "d" | "w" | "h" | "mo" | "auto-approximate";
            type: "duration";
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            from: string;
            to: string;
            type: "duration";
        }> | Readonly<{
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
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
    } & {
        column: string;
    }>[];
    sampling: number;
    ignore_global_filters: boolean;
}>>;
export type TreemapConfig = TypeOf<typeof treemapConfigSchema>;
export type TreemapConfigNoESQL = TypeOf<typeof treemapConfigSchemaNoESQL>;
export type TreemapConfigESQL = TypeOf<typeof treemapConfigSchemaESQL>;
