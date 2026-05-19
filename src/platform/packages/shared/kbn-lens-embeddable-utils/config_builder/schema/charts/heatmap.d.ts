import { type TypeOf } from '@kbn/config-schema';
export declare const heatmapConfigSchemaNoESQL: import("@kbn/config-schema").ObjectType<{
    styling: import("@kbn/config-schema").Type<Readonly<{
        cells?: Readonly<{
            labels?: Readonly<{
                visible?: boolean | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
    metric: import("@kbn/config-schema").Type<Readonly<{
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "counter_rate";
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
    } & {
        formula: string;
        operation: "formula";
    }>>;
    data_source: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<{
        type: import("@kbn/config-schema").Type<"data_view_reference">;
        ref_id: import("@kbn/config-schema").Type<string>;
    } | {
        type: import("@kbn/config-schema").Type<"data_view_spec">;
        index_pattern: import("@kbn/config-schema").Type<string>;
        time_field: import("@kbn/config-schema").Type<string | undefined>;
        field_settings: import("@kbn/config-schema").Type<Record<string, Readonly<{
            format?: Readonly<{
                params?: any;
            } & {
                type: string;
            }> | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
        } & {}> | Readonly<{
            format?: Readonly<{
                params?: any;
            } & {
                type: string;
            }> | undefined;
            script?: string | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
        } & {
            type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point";
        }> | Readonly<{
            script?: string | undefined;
        } & {
            fields: Record<string, Readonly<{
                format?: Readonly<{
                    params?: any;
                } & {
                    type: string;
                }> | undefined;
                custom_label?: string | undefined;
                custom_description?: string | undefined;
            } & {
                type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point";
            }>>;
            type: "composite";
        }>> | undefined>;
    }>>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    }> | undefined>;
    axis: import("@kbn/config-schema").Type<Readonly<{
        y?: Readonly<{
            sort?: "asc" | "desc" | undefined;
            labels?: Readonly<{
                visible?: boolean | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
        x?: Readonly<{
            sort?: "asc" | "desc" | undefined;
            labels?: Readonly<{
                visible?: boolean | undefined;
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
        } & {
            scale: "linear" | "ordinal" | "temporal";
        }> | undefined;
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
            value: import("@kbn/config-schema").Type<string[] | number[] | boolean[]>;
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
                value: import("@kbn/config-schema").Type<string[] | number[] | boolean[]>;
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
    type: import("@kbn/config-schema").Type<"heatmap">;
    legend: import("@kbn/config-schema").Type<Readonly<{
        size?: "m" | "s" | "auto" | "l" | "xl" | undefined;
        position?: "right" | "top" | "left" | "bottom" | undefined;
        visibility?: "hidden" | "visible" | undefined;
        truncate_after_lines?: number | undefined;
    } & {}> | undefined>;
}>;
export declare const heatmapConfigSchemaESQL: import("@kbn/config-schema").ObjectType<{
    styling: import("@kbn/config-schema").Type<Readonly<{
        cells?: Readonly<{
            labels?: Readonly<{
                visible?: boolean | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
    metric: import("@kbn/config-schema").ObjectType<Omit<Omit<{
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
    }, "color"> & {
        color: import("@kbn/config-schema").Type<Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined>;
    }>;
    data_source: import("@kbn/config-schema").ObjectType<{
        type: import("@kbn/config-schema").Type<"esql">;
        query: import("@kbn/config-schema").Type<string>;
    }>;
    x: import("@kbn/config-schema").ObjectType<Omit<{
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
    y: import("@kbn/config-schema").Type<Readonly<{
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
        column: string;
    }> | undefined>;
    axis: import("@kbn/config-schema").Type<Readonly<{
        y?: Readonly<{
            sort?: "asc" | "desc" | undefined;
            labels?: Readonly<{
                visible?: boolean | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
        x?: Readonly<{
            sort?: "asc" | "desc" | undefined;
            labels?: Readonly<{
                visible?: boolean | undefined;
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
        } & {
            scale: "linear" | "ordinal" | "temporal";
        }> | undefined;
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
            value: import("@kbn/config-schema").Type<string[] | number[] | boolean[]>;
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
                value: import("@kbn/config-schema").Type<string[] | number[] | boolean[]>;
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
    type: import("@kbn/config-schema").Type<"heatmap">;
    legend: import("@kbn/config-schema").Type<Readonly<{
        size?: "m" | "s" | "auto" | "l" | "xl" | undefined;
        position?: "right" | "top" | "left" | "bottom" | undefined;
        visibility?: "hidden" | "visible" | undefined;
        truncate_after_lines?: number | undefined;
    } & {}> | undefined>;
}>;
export declare const heatmapConfigSchema: import("./utils/object_union").ObjectUnionType<[import("@kbn/config-schema").ObjectType<{
    styling: import("@kbn/config-schema").Type<Readonly<{
        cells?: Readonly<{
            labels?: Readonly<{
                visible?: boolean | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
    metric: import("@kbn/config-schema").Type<Readonly<{
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "counter_rate";
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
    } & {
        formula: string;
        operation: "formula";
    }>>;
    data_source: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<{
        type: import("@kbn/config-schema").Type<"data_view_reference">;
        ref_id: import("@kbn/config-schema").Type<string>;
    } | {
        type: import("@kbn/config-schema").Type<"data_view_spec">;
        index_pattern: import("@kbn/config-schema").Type<string>;
        time_field: import("@kbn/config-schema").Type<string | undefined>;
        field_settings: import("@kbn/config-schema").Type<Record<string, Readonly<{
            format?: Readonly<{
                params?: any;
            } & {
                type: string;
            }> | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
        } & {}> | Readonly<{
            format?: Readonly<{
                params?: any;
            } & {
                type: string;
            }> | undefined;
            script?: string | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
        } & {
            type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point";
        }> | Readonly<{
            script?: string | undefined;
        } & {
            fields: Record<string, Readonly<{
                format?: Readonly<{
                    params?: any;
                } & {
                    type: string;
                }> | undefined;
                custom_label?: string | undefined;
                custom_description?: string | undefined;
            } & {
                type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point";
            }>>;
            type: "composite";
        }>> | undefined>;
    }>>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
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
    }> | undefined>;
    axis: import("@kbn/config-schema").Type<Readonly<{
        y?: Readonly<{
            sort?: "asc" | "desc" | undefined;
            labels?: Readonly<{
                visible?: boolean | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
        x?: Readonly<{
            sort?: "asc" | "desc" | undefined;
            labels?: Readonly<{
                visible?: boolean | undefined;
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
        } & {
            scale: "linear" | "ordinal" | "temporal";
        }> | undefined;
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
            value: import("@kbn/config-schema").Type<string[] | number[] | boolean[]>;
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
                value: import("@kbn/config-schema").Type<string[] | number[] | boolean[]>;
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
    type: import("@kbn/config-schema").Type<"heatmap">;
    legend: import("@kbn/config-schema").Type<Readonly<{
        size?: "m" | "s" | "auto" | "l" | "xl" | undefined;
        position?: "right" | "top" | "left" | "bottom" | undefined;
        visibility?: "hidden" | "visible" | undefined;
        truncate_after_lines?: number | undefined;
    } & {}> | undefined>;
}>, import("@kbn/config-schema").ObjectType<{
    styling: import("@kbn/config-schema").Type<Readonly<{
        cells?: Readonly<{
            labels?: Readonly<{
                visible?: boolean | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
    metric: import("@kbn/config-schema").ObjectType<Omit<Omit<{
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
    }, "color"> & {
        color: import("@kbn/config-schema").Type<Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined>;
    }>;
    data_source: import("@kbn/config-schema").ObjectType<{
        type: import("@kbn/config-schema").Type<"esql">;
        query: import("@kbn/config-schema").Type<string>;
    }>;
    x: import("@kbn/config-schema").ObjectType<Omit<{
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
    y: import("@kbn/config-schema").Type<Readonly<{
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
        column: string;
    }> | undefined>;
    axis: import("@kbn/config-schema").Type<Readonly<{
        y?: Readonly<{
            sort?: "asc" | "desc" | undefined;
            labels?: Readonly<{
                visible?: boolean | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
        x?: Readonly<{
            sort?: "asc" | "desc" | undefined;
            labels?: Readonly<{
                visible?: boolean | undefined;
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
        } & {
            scale: "linear" | "ordinal" | "temporal";
        }> | undefined;
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
            value: import("@kbn/config-schema").Type<string[] | number[] | boolean[]>;
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
                value: import("@kbn/config-schema").Type<string[] | number[] | boolean[]>;
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
    type: import("@kbn/config-schema").Type<"heatmap">;
    legend: import("@kbn/config-schema").Type<Readonly<{
        size?: "m" | "s" | "auto" | "l" | "xl" | undefined;
        position?: "right" | "top" | "left" | "bottom" | undefined;
        visibility?: "hidden" | "visible" | undefined;
        truncate_after_lines?: number | undefined;
    } & {}> | undefined>;
}>], Readonly<{
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
            value: import("@kbn/config-schema").Type<string[] | number[] | boolean[]>;
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
                value: import("@kbn/config-schema").Type<string[] | number[] | boolean[]>;
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
    query?: Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined;
    description?: string | undefined;
    title?: string | undefined;
    legend?: Readonly<{
        size?: "m" | "s" | "auto" | "l" | "xl" | undefined;
        position?: "right" | "top" | "left" | "bottom" | undefined;
        visibility?: "hidden" | "visible" | undefined;
        truncate_after_lines?: number | undefined;
    } & {}> | undefined;
    styling?: Readonly<{
        cells?: Readonly<{
            labels?: Readonly<{
                visible?: boolean | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
    } & {}> | undefined;
    axis?: Readonly<{
        y?: Readonly<{
            sort?: "asc" | "desc" | undefined;
            labels?: Readonly<{
                visible?: boolean | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
        x?: Readonly<{
            sort?: "asc" | "desc" | undefined;
            labels?: Readonly<{
                visible?: boolean | undefined;
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
        } & {
            scale: "linear" | "ordinal" | "temporal";
        }> | undefined;
    } & {}> | undefined;
} & {
    type: "heatmap";
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
    }>;
    metric: Readonly<{
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
    } & {
        field: string;
        operation: "counter_rate";
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
    } & {
        formula: string;
        operation: "formula";
    }>;
    data_source: import("@kbn/config-schema/src/types").ObjectResultUnionType<{
        type: import("@kbn/config-schema").Type<"data_view_reference">;
        ref_id: import("@kbn/config-schema").Type<string>;
    } | {
        type: import("@kbn/config-schema").Type<"data_view_spec">;
        index_pattern: import("@kbn/config-schema").Type<string>;
        time_field: import("@kbn/config-schema").Type<string | undefined>;
        field_settings: import("@kbn/config-schema").Type<Record<string, Readonly<{
            format?: Readonly<{
                params?: any;
            } & {
                type: string;
            }> | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
        } & {}> | Readonly<{
            format?: Readonly<{
                params?: any;
            } & {
                type: string;
            }> | undefined;
            script?: string | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
        } & {
            type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point";
        }> | Readonly<{
            script?: string | undefined;
        } & {
            fields: Record<string, Readonly<{
                format?: Readonly<{
                    params?: any;
                } & {
                    type: string;
                }> | undefined;
                custom_label?: string | undefined;
                custom_description?: string | undefined;
            } & {
                type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point";
            }>>;
            type: "composite";
        }>> | undefined>;
    }>;
    sampling: number;
    ignore_global_filters: boolean;
}> | Readonly<{
    y?: Readonly<{
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
            value: import("@kbn/config-schema").Type<string[] | number[] | boolean[]>;
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
                value: import("@kbn/config-schema").Type<string[] | number[] | boolean[]>;
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
    description?: string | undefined;
    title?: string | undefined;
    legend?: Readonly<{
        size?: "m" | "s" | "auto" | "l" | "xl" | undefined;
        position?: "right" | "top" | "left" | "bottom" | undefined;
        visibility?: "hidden" | "visible" | undefined;
        truncate_after_lines?: number | undefined;
    } & {}> | undefined;
    styling?: Readonly<{
        cells?: Readonly<{
            labels?: Readonly<{
                visible?: boolean | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
    } & {}> | undefined;
    axis?: Readonly<{
        y?: Readonly<{
            sort?: "asc" | "desc" | undefined;
            labels?: Readonly<{
                visible?: boolean | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
        x?: Readonly<{
            sort?: "asc" | "desc" | undefined;
            labels?: Readonly<{
                visible?: boolean | undefined;
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
        } & {
            scale: "linear" | "ordinal" | "temporal";
        }> | undefined;
    } & {}> | undefined;
} & {
    type: "heatmap";
    x: Readonly<{
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
        column: string;
    }>;
    metric: Readonly<{
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
        color?: Readonly<{} & {
            range: "absolute" | "percentage";
            type: "legacy_dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
            shift: boolean;
            palette: string;
        }> | Readonly<{} & {
            range: "absolute";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            range: "percentage";
            type: "dynamic";
            steps: Readonly<{
                gte?: number | null | undefined;
                lt?: number | null | undefined;
                lte?: number | null | undefined;
            } & {
                color: string;
            }>[];
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
    } & {
        column: string;
    }>;
    data_source: Readonly<{} & {
        type: "esql";
        query: string;
    }>;
    sampling: number;
    ignore_global_filters: boolean;
}>>;
export type HeatmapConfig = TypeOf<typeof heatmapConfigSchema>;
export type HeatmapConfigNoESQL = TypeOf<typeof heatmapConfigSchemaNoESQL>;
export type HeatmapConfigESQL = TypeOf<typeof heatmapConfigSchemaESQL>;
