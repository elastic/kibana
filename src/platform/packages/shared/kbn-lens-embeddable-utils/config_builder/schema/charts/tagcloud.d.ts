import type { TypeOf } from '@kbn/config-schema';
export declare const tagcloudStateSchemaNoESQL: import("@kbn/config-schema").ObjectType<{
    /**
     * Primary value configuration, must define operation.
     */
    metric: import("@kbn/config-schema").Type<Readonly<{
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
        show_metric_label?: boolean | undefined;
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
        show_metric_label?: boolean | undefined;
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
        show_metric_label?: boolean | undefined;
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
        show_metric_label?: boolean | undefined;
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
        show_metric_label?: boolean | undefined;
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
        show_metric_label?: boolean | undefined;
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
        show_metric_label?: boolean | undefined;
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
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        show_metric_label?: boolean | undefined;
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
        show_metric_label?: boolean | undefined;
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
        show_metric_label?: boolean | undefined;
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
        show_metric_label?: boolean | undefined;
    } & {
        field: string;
        operation: "counter_rate";
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
        show_metric_label?: boolean | undefined;
    } & {
        operation: "formula";
        formula: string;
    }>>;
    /**
     * Configure how to break down to tags
     */
    tag_by: import("@kbn/config-schema").Type<Readonly<{
        color?: Readonly<{
            unassignedColor?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
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
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | undefined;
        label?: string | undefined;
        drop_partial_intervals?: boolean | undefined;
    } & {
        field: string;
        operation: "date_histogram";
        suggested_interval: string;
        use_original_time_range: boolean;
        include_empty_rows: boolean;
    }> | Readonly<{
        color?: Readonly<{
            unassignedColor?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
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
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | undefined;
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
        color?: Readonly<{
            unassignedColor?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
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
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
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
    } & {
        field: string;
        operation: "histogram";
        include_empty_rows: boolean;
        granularity: number | "auto";
    }> | Readonly<{
        color?: Readonly<{
            unassignedColor?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
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
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
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
    } & {
        field: string;
        operation: "range";
        ranges: Readonly<{
            label?: string | undefined;
            gt?: number | undefined;
            lte?: number | undefined;
        } & {}>[];
    }> | Readonly<{
        color?: Readonly<{
            unassignedColor?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
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
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | undefined;
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
    }>>;
    orientation: import("@kbn/config-schema").Type<"horizontal" | "vertical" | "angled" | undefined>;
    font_size: import("@kbn/config-schema").Type<Readonly<{} & {
        max: number;
        min: number;
    }> | undefined>;
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
    ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
    sampling: import("@kbn/config-schema").Type<number>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined>;
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
    type: import("@kbn/config-schema").Type<"tag_cloud">;
}>;
export declare const tagcloudStateSchemaESQL: import("@kbn/config-schema").ObjectType<{
    /**
     * Primary value configuration, must define operation.
     */
    metric: import("@kbn/config-schema").ObjectType<Omit<Omit<{
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
    }, "show_metric_label"> & {
        show_metric_label: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
    /**
     * Configure how to break down the metric (e.g. show one metric per term).
     */
    tag_by: import("@kbn/config-schema").ObjectType<Omit<{
        operation: import("@kbn/config-schema").Type<"value">;
        column: import("@kbn/config-schema").Type<string>;
    }, "color"> & {
        color: import("@kbn/config-schema").Type<Readonly<{
            unassignedColor?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
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
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | undefined>;
    }>;
    orientation: import("@kbn/config-schema").Type<"horizontal" | "vertical" | "angled" | undefined>;
    font_size: import("@kbn/config-schema").Type<Readonly<{} & {
        max: number;
        min: number;
    }> | undefined>;
    dataset: import("@kbn/config-schema").Type<Readonly<{} & {
        type: "esql";
        query: string;
    }> | Readonly<{
        table?: any;
    } & {
        type: "table";
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
    type: import("@kbn/config-schema").Type<"tag_cloud">;
}>;
export declare const tagcloudStateSchema: import("@kbn/config-schema").Type<Readonly<{
    title?: string | undefined;
    description?: string | undefined;
    query?: Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined;
    orientation?: "horizontal" | "vertical" | "angled" | undefined;
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
    font_size?: Readonly<{} & {
        max: number;
        min: number;
    }> | undefined;
} & {
    type: "tag_cloud";
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
    metric: Readonly<{
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
        show_metric_label?: boolean | undefined;
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
        show_metric_label?: boolean | undefined;
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
        show_metric_label?: boolean | undefined;
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
        show_metric_label?: boolean | undefined;
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
        show_metric_label?: boolean | undefined;
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
        show_metric_label?: boolean | undefined;
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
        show_metric_label?: boolean | undefined;
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
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        show_metric_label?: boolean | undefined;
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
        show_metric_label?: boolean | undefined;
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
        show_metric_label?: boolean | undefined;
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
        show_metric_label?: boolean | undefined;
    } & {
        field: string;
        operation: "counter_rate";
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
        show_metric_label?: boolean | undefined;
    } & {
        operation: "formula";
        formula: string;
    }>;
    sampling: number;
    ignore_global_filters: boolean;
    tag_by: Readonly<{
        color?: Readonly<{
            unassignedColor?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
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
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | undefined;
        label?: string | undefined;
        drop_partial_intervals?: boolean | undefined;
    } & {
        field: string;
        operation: "date_histogram";
        suggested_interval: string;
        use_original_time_range: boolean;
        include_empty_rows: boolean;
    }> | Readonly<{
        color?: Readonly<{
            unassignedColor?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
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
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | undefined;
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
        color?: Readonly<{
            unassignedColor?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
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
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
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
    } & {
        field: string;
        operation: "histogram";
        include_empty_rows: boolean;
        granularity: number | "auto";
    }> | Readonly<{
        color?: Readonly<{
            unassignedColor?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
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
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
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
    } & {
        field: string;
        operation: "range";
        ranges: Readonly<{
            label?: string | undefined;
            gt?: number | undefined;
            lte?: number | undefined;
        } & {}>[];
    }> | Readonly<{
        color?: Readonly<{
            unassignedColor?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
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
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | undefined;
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
    }>;
}> | Readonly<{
    title?: string | undefined;
    description?: string | undefined;
    orientation?: "horizontal" | "vertical" | "angled" | undefined;
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
    font_size?: Readonly<{} & {
        max: number;
        min: number;
    }> | undefined;
} & {
    type: "tag_cloud";
    dataset: Readonly<{} & {
        type: "esql";
        query: string;
    }> | Readonly<{
        table?: any;
    } & {
        type: "table";
    }>;
    metric: Readonly<{
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
        show_metric_label?: boolean | undefined;
    } & {
        operation: "value";
        column: string;
    }>;
    sampling: number;
    ignore_global_filters: boolean;
    tag_by: Readonly<{
        color?: Readonly<{
            unassignedColor?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
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
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
            sort?: "desc" | "asc" | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            mapping?: Readonly<{} & {
                values: (string | number | Readonly<{} & {
                    type: "range_key";
                    from: string | number;
                    to: string | number;
                    ranges: Readonly<{} & {
                        label: string;
                        from: string | number;
                        to: string | number;
                    }>[];
                }> | Readonly<{} & {
                    keys: string[];
                    type: "multi_field_key";
                }>)[];
            }>[] | undefined;
            unassignedColor?: Readonly<{
                palette?: string | undefined;
            } & {
                type: "from_palette";
                index: number;
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            palette: string;
            mode: "gradient";
        }> | undefined;
    } & {
        operation: "value";
        column: string;
    }>;
}>>;
export type TagcloudState = TypeOf<typeof tagcloudStateSchema>;
export type TagcloudStateNoESQL = TypeOf<typeof tagcloudStateSchemaNoESQL>;
export type TagcloudStateESQL = TypeOf<typeof tagcloudStateSchemaESQL>;
