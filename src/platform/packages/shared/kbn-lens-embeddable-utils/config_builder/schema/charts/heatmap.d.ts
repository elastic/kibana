import { type TypeOf } from '@kbn/config-schema';
export declare const heatmapStateSchemaNoESQL: import("@kbn/config-schema").ObjectType<{
    metric: import("@kbn/config-schema").Type<Readonly<{
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | undefined;
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
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | undefined;
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
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | undefined;
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
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | undefined;
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
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | undefined;
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
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | undefined;
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
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | undefined;
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
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | undefined;
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
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | undefined;
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
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | undefined;
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
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | undefined;
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
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | undefined;
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
    dataset: import("@kbn/config-schema").Type<Readonly<{} & {
        id: string;
        type: "dataView";
    }> | Readonly<{
        time_field?: string | undefined;
        runtime_fields?: Readonly<{
            format?: any;
        } & {
            type: string;
            name: string;
        }>[] | undefined;
    } & {
        type: "index";
        index: string;
    }>>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined>;
    x: import("@kbn/config-schema").Type<Readonly<{
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
            direction: "desc" | "asc";
            type: "alphabetical";
        }> | Readonly<{} & {
            type: "rare";
            max: number;
        }> | Readonly<{} & {
            type: "significant";
        }> | Readonly<{} & {
            direction: "desc" | "asc";
            type: "column";
            metric: number;
        }> | Readonly<{} & {
            field: string;
            direction: "desc" | "asc";
            type: "custom";
            operation: "max" | "min" | "count" | "median" | "sum" | "percentile" | "average" | "unique_count" | "last_value" | "percentile_rank" | "standard_deviation";
        }> | undefined;
    } & {
        size: number;
        operation: "terms";
        fields: string[];
    }> | Readonly<{
        label?: string | undefined;
    } & {
        filters: Readonly<{
            label?: string | undefined;
        } & {
            filter: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
            }>;
        }>[];
        operation: "filters";
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
        field: string;
        operation: "histogram";
        include_empty_rows: boolean;
        granularity: number | "auto";
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
        field: string;
        operation: "range";
        ranges: Readonly<{
            label?: string | undefined;
            gt?: number | undefined;
            lte?: number | undefined;
        } & {}>[];
    }>>;
    y: import("@kbn/config-schema").Type<Readonly<{
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
            direction: "desc" | "asc";
            type: "alphabetical";
        }> | Readonly<{} & {
            type: "rare";
            max: number;
        }> | Readonly<{} & {
            type: "significant";
        }> | Readonly<{} & {
            direction: "desc" | "asc";
            type: "column";
            metric: number;
        }> | Readonly<{} & {
            field: string;
            direction: "desc" | "asc";
            type: "custom";
            operation: "max" | "min" | "count" | "median" | "sum" | "percentile" | "average" | "unique_count" | "last_value" | "percentile_rank" | "standard_deviation";
        }> | undefined;
    } & {
        size: number;
        operation: "terms";
        fields: string[];
    }> | Readonly<{
        label?: string | undefined;
    } & {
        filters: Readonly<{
            label?: string | undefined;
        } & {
            filter: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
            }>;
        }>[];
        operation: "filters";
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
        field: string;
        operation: "histogram";
        include_empty_rows: boolean;
        granularity: number | "auto";
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
        field: string;
        operation: "range";
        ranges: Readonly<{
            label?: string | undefined;
            gt?: number | undefined;
            lte?: number | undefined;
        } & {}>[];
    }> | undefined>;
    axis: import("@kbn/config-schema").Type<Readonly<{
        x?: Readonly<{
            title?: Readonly<{
                value?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            sort?: "desc" | "asc" | undefined;
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
        y?: Readonly<{
            title?: Readonly<{
                value?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            sort?: "desc" | "asc" | undefined;
            labels?: Readonly<{
                visible?: boolean | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
    cells: import("@kbn/config-schema").Type<Readonly<{
        labels?: Readonly<{
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
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
    }, "group" | "type"> & {
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
        type: import("@kbn/config-schema").Type<"group">;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "field" | "type" | "params" | "dsl"> & {
        field: import("@kbn/config-schema").Type<string | undefined>;
        type: import("@kbn/config-schema").Type<"dsl">;
        params: import("@kbn/config-schema").Type<any>;
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
    type: import("@kbn/config-schema").Type<"heat_map">;
    legend: import("@kbn/config-schema").Type<Readonly<{
        size?: "auto" | "small" | "medium" | "large" | "xlarge" | undefined;
        position?: "left" | "right" | "top" | "bottom" | undefined;
        visible?: boolean | undefined;
        truncate_after_lines?: number | undefined;
    } & {}> | undefined>;
}>;
export declare const heatmapStateSchemaESQL: import("@kbn/config-schema").ObjectType<{
    metric: import("@kbn/config-schema").ObjectType<Omit<{
        operation: import("@kbn/config-schema").Type<"value">;
        column: import("@kbn/config-schema").Type<string>;
    }, "color"> & {
        color: import("@kbn/config-schema").Type<Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | undefined>;
    }>;
    dataset: import("@kbn/config-schema").Type<Readonly<{} & {
        type: "esql";
        query: string;
    }> | Readonly<{
        table?: any;
    } & {
        type: "table";
    }>>;
    x: import("@kbn/config-schema").ObjectType<{
        operation: import("@kbn/config-schema").Type<"value">;
        column: import("@kbn/config-schema").Type<string>;
    }>;
    y: import("@kbn/config-schema").Type<Readonly<{} & {
        operation: "value";
        column: string;
    }> | undefined>;
    axis: import("@kbn/config-schema").Type<Readonly<{
        x?: Readonly<{
            title?: Readonly<{
                value?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            sort?: "desc" | "asc" | undefined;
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
        y?: Readonly<{
            title?: Readonly<{
                value?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            sort?: "desc" | "asc" | undefined;
            labels?: Readonly<{
                visible?: boolean | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
    cells: import("@kbn/config-schema").Type<Readonly<{
        labels?: Readonly<{
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
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
    }, "group" | "type"> & {
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
        type: import("@kbn/config-schema").Type<"group">;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "field" | "type" | "params" | "dsl"> & {
        field: import("@kbn/config-schema").Type<string | undefined>;
        type: import("@kbn/config-schema").Type<"dsl">;
        params: import("@kbn/config-schema").Type<any>;
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
    type: import("@kbn/config-schema").Type<"heat_map">;
    legend: import("@kbn/config-schema").Type<Readonly<{
        size?: "auto" | "small" | "medium" | "large" | "xlarge" | undefined;
        position?: "left" | "right" | "top" | "bottom" | undefined;
        visible?: boolean | undefined;
        truncate_after_lines?: number | undefined;
    } & {}> | undefined>;
}>;
export declare const heatmapStateSchema: import("@kbn/config-schema").Type<Readonly<{
    title?: string | undefined;
    description?: string | undefined;
    legend?: Readonly<{
        size?: "auto" | "small" | "medium" | "large" | "xlarge" | undefined;
        position?: "left" | "right" | "top" | "bottom" | undefined;
        visible?: boolean | undefined;
        truncate_after_lines?: number | undefined;
    } & {}> | undefined;
    query?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    y?: Readonly<{
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
            direction: "desc" | "asc";
            type: "alphabetical";
        }> | Readonly<{} & {
            type: "rare";
            max: number;
        }> | Readonly<{} & {
            type: "significant";
        }> | Readonly<{} & {
            direction: "desc" | "asc";
            type: "column";
            metric: number;
        }> | Readonly<{} & {
            field: string;
            direction: "desc" | "asc";
            type: "custom";
            operation: "max" | "min" | "count" | "median" | "sum" | "percentile" | "average" | "unique_count" | "last_value" | "percentile_rank" | "standard_deviation";
        }> | undefined;
    } & {
        size: number;
        operation: "terms";
        fields: string[];
    }> | Readonly<{
        label?: string | undefined;
    } & {
        filters: Readonly<{
            label?: string | undefined;
        } & {
            filter: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
            }>;
        }>[];
        operation: "filters";
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
        field: string;
        operation: "histogram";
        include_empty_rows: boolean;
        granularity: number | "auto";
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
        field: string;
        operation: "range";
        ranges: Readonly<{
            label?: string | undefined;
            gt?: number | undefined;
            lte?: number | undefined;
        } & {}>[];
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
    }, "group" | "type"> & {
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
        type: import("@kbn/config-schema").Type<"group">;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "field" | "type" | "params" | "dsl"> & {
        field: import("@kbn/config-schema").Type<string | undefined>;
        type: import("@kbn/config-schema").Type<"dsl">;
        params: import("@kbn/config-schema").Type<any>;
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
    axis?: Readonly<{
        x?: Readonly<{
            title?: Readonly<{
                value?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            sort?: "desc" | "asc" | undefined;
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
        y?: Readonly<{
            title?: Readonly<{
                value?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            sort?: "desc" | "asc" | undefined;
            labels?: Readonly<{
                visible?: boolean | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
    } & {}> | undefined;
    cells?: Readonly<{
        labels?: Readonly<{
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | undefined;
} & {
    type: "heat_map";
    dataset: Readonly<{} & {
        id: string;
        type: "dataView";
    }> | Readonly<{
        time_field?: string | undefined;
        runtime_fields?: Readonly<{
            format?: any;
        } & {
            type: string;
            name: string;
        }>[] | undefined;
    } & {
        type: "index";
        index: string;
    }>;
    x: Readonly<{
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
            direction: "desc" | "asc";
            type: "alphabetical";
        }> | Readonly<{} & {
            type: "rare";
            max: number;
        }> | Readonly<{} & {
            type: "significant";
        }> | Readonly<{} & {
            direction: "desc" | "asc";
            type: "column";
            metric: number;
        }> | Readonly<{} & {
            field: string;
            direction: "desc" | "asc";
            type: "custom";
            operation: "max" | "min" | "count" | "median" | "sum" | "percentile" | "average" | "unique_count" | "last_value" | "percentile_rank" | "standard_deviation";
        }> | undefined;
    } & {
        size: number;
        operation: "terms";
        fields: string[];
    }> | Readonly<{
        label?: string | undefined;
    } & {
        filters: Readonly<{
            label?: string | undefined;
        } & {
            filter: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
            }>;
        }>[];
        operation: "filters";
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
        field: string;
        operation: "histogram";
        include_empty_rows: boolean;
        granularity: number | "auto";
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
        field: string;
        operation: "range";
        ranges: Readonly<{
            label?: string | undefined;
            gt?: number | undefined;
            lte?: number | undefined;
        } & {}>[];
    }>;
    metric: Readonly<{
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | undefined;
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
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | undefined;
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
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | undefined;
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
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | undefined;
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
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | undefined;
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
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | undefined;
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
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | undefined;
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
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | undefined;
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
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | undefined;
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
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | undefined;
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
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | undefined;
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
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | undefined;
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
    }>;
    sampling: number;
    ignore_global_filters: boolean;
}> | Readonly<{
    title?: string | undefined;
    description?: string | undefined;
    legend?: Readonly<{
        size?: "auto" | "small" | "medium" | "large" | "xlarge" | undefined;
        position?: "left" | "right" | "top" | "bottom" | undefined;
        visible?: boolean | undefined;
        truncate_after_lines?: number | undefined;
    } & {}> | undefined;
    y?: Readonly<{} & {
        operation: "value";
        column: string;
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
    }, "group" | "type"> & {
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
        type: import("@kbn/config-schema").Type<"group">;
    }) | (Omit<{
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlled_by: import("@kbn/config-schema").Type<string | undefined>;
        data_view_id: import("@kbn/config-schema").Type<string | undefined>;
        label: import("@kbn/config-schema").Type<string | undefined>;
        is_multi_index: import("@kbn/config-schema").Type<boolean | undefined>;
    }, "field" | "type" | "params" | "dsl"> & {
        field: import("@kbn/config-schema").Type<string | undefined>;
        type: import("@kbn/config-schema").Type<"dsl">;
        params: import("@kbn/config-schema").Type<any>;
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
    axis?: Readonly<{
        x?: Readonly<{
            title?: Readonly<{
                value?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            sort?: "desc" | "asc" | undefined;
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
        y?: Readonly<{
            title?: Readonly<{
                value?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            sort?: "desc" | "asc" | undefined;
            labels?: Readonly<{
                visible?: boolean | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
    } & {}> | undefined;
    cells?: Readonly<{
        labels?: Readonly<{
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | undefined;
} & {
    type: "heat_map";
    dataset: Readonly<{} & {
        type: "esql";
        query: string;
    }> | Readonly<{
        table?: any;
    } & {
        type: "table";
    }>;
    x: Readonly<{} & {
        operation: "value";
        column: string;
    }>;
    metric: Readonly<{
        color?: Readonly<{} & {
            shift: boolean;
            type: "legacy_dynamic";
            palette: string;
            range: "absolute" | "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "absolute";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "dynamic";
            range: "percentage";
            steps: Readonly<{
                lt?: number | null | undefined;
                gte?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | undefined;
    } & {
        operation: "value";
        column: string;
    }>;
    sampling: number;
    ignore_global_filters: boolean;
}>>;
export type HeatmapState = TypeOf<typeof heatmapStateSchema>;
export type HeatmapStateNoESQL = TypeOf<typeof heatmapStateSchemaNoESQL>;
export type HeatmapStateESQL = TypeOf<typeof heatmapStateSchemaESQL>;
