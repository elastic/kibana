import type { TypeOf } from '@kbn/config-schema';
/**
 * Statistical functions that can be displayed in chart legend for data series
 */
export declare const statisticsSchema: import("@kbn/config-schema").Type<"total" | "max" | "min" | "count" | "median" | "range" | "avg" | "variance" | "difference" | "last_value" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value">;
export declare const statisticsOptionsSize = 17;
declare const XY_API_LINE_INTERPOLATION: {
    readonly LINEAR: "linear";
    readonly SMOOTH: "smooth";
    readonly STEPPED: "stepped";
};
export type XYApiLineInterpolation = typeof XY_API_LINE_INTERPOLATION;
declare const decorationsSchema: import("@kbn/config-schema").ObjectType<{
    show_end_zones: import("@kbn/config-schema").Type<boolean | undefined>;
    show_current_time_marker: import("@kbn/config-schema").Type<boolean | undefined>;
    point_visibility: import("@kbn/config-schema").Type<"auto" | "never" | "always" | undefined>;
    line_interpolation: import("@kbn/config-schema").Type<"linear" | "smooth" | "stepped" | undefined>;
    minimum_bar_height: import("@kbn/config-schema").Type<number | undefined>;
    show_value_labels: import("@kbn/config-schema").Type<boolean | undefined>;
    fill_opacity: import("@kbn/config-schema").Type<number | undefined>;
}>;
declare const xScaleSchema: import("@kbn/config-schema").Type<"linear" | "ordinal" | "temporal" | undefined>;
/**
 * Data layer configuration for standard (non-ES|QL) queries with breakdown and metrics
 */
declare const xyDataLayerSchemaNoESQL: import("@kbn/config-schema").ObjectType<{
    breakdown_by: import("@kbn/config-schema").Type<Readonly<{
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
        collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
        aggregate_first?: boolean | undefined;
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
        collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
        aggregate_first?: boolean | undefined;
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
        collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
        aggregate_first?: boolean | undefined;
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
        collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
        aggregate_first?: boolean | undefined;
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
        collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
        aggregate_first?: boolean | undefined;
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
    }> | undefined>;
    y: import("@kbn/config-schema").Type<(Readonly<{
        color?: Readonly<{} & {
            color: string;
            type: "static";
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
        axis?: "left" | "right" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        color?: Readonly<{} & {
            color: string;
            type: "static";
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
        axis?: "left" | "right" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        color?: Readonly<{} & {
            color: string;
            type: "static";
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
        axis?: "left" | "right" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "max" | "min" | "median" | "average" | "standard_deviation";
    }> | Readonly<{
        color?: Readonly<{} & {
            color: string;
            type: "static";
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
        axis?: "left" | "right" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        color?: Readonly<{} & {
            color: string;
            type: "static";
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
        axis?: "left" | "right" | undefined;
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
            color: string;
            type: "static";
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
        axis?: "left" | "right" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "percentile";
        percentile: number;
    }> | Readonly<{
        color?: Readonly<{} & {
            color: string;
            type: "static";
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
        axis?: "left" | "right" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "percentile_rank";
        rank: number;
    }> | Readonly<{
        color?: Readonly<{} & {
            color: string;
            type: "static";
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
        axis?: "left" | "right" | undefined;
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
            color: string;
            type: "static";
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
        axis?: "left" | "right" | undefined;
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
            color: string;
            type: "static";
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
        axis?: "left" | "right" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "cumulative_sum";
    }> | Readonly<{
        color?: Readonly<{} & {
            color: string;
            type: "static";
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
        axis?: "left" | "right" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        field: string;
        operation: "counter_rate";
    }> | Readonly<{
        color?: Readonly<{} & {
            color: string;
            type: "static";
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
        axis?: "left" | "right" | undefined;
        reduced_time_range?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
    } & {
        operation: "formula";
        formula: string;
    }>)[]>;
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
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
    }> | undefined>;
    type: import("@kbn/config-schema").Type<"area" | "line" | "bar" | "bar_stacked" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage">;
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
}>;
/**
 * Data layer configuration for ES|QL queries with column-based metrics
 */
declare const xyDataLayerSchemaESQL: import("@kbn/config-schema").ObjectType<{
    breakdown_by: import("@kbn/config-schema").Type<Readonly<{
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
        collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
    } & {
        operation: "value";
        column: string;
    }> | undefined>;
    y: import("@kbn/config-schema").Type<Readonly<{
        color?: Readonly<{} & {
            color: string;
            type: "static";
        }> | undefined;
        axis?: "left" | "right" | undefined;
    } & {
        operation: "value";
        column: string;
    }>[]>;
    x: import("@kbn/config-schema").Type<Readonly<{} & {
        operation: "value";
        column: string;
    }> | undefined>;
    type: import("@kbn/config-schema").Type<"area" | "line" | "bar" | "bar_stacked" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage">;
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
}>;
/**
 * Reference line layer for standard queries with threshold values
 */
declare const referenceLineLayerSchemaNoESQL: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"referenceLines">;
    thresholds: import("@kbn/config-schema").Type<(Readonly<{
        color?: Readonly<{} & {
            color: string;
            type: "static";
        }> | undefined;
        field?: string | undefined;
        text?: "none" | "label" | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        fill?: "above" | "below" | undefined;
        label?: string | undefined;
        icon?: "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "editorComment" | "flag" | "heart" | "mapMarker" | "pinFilled" | "starEmpty" | "starFilled" | "tag" | "triangle" | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
        axis?: "left" | "right" | "bottom" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        decoration_position?: "auto" | "left" | "right" | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        color?: Readonly<{} & {
            color: string;
            type: "static";
        }> | undefined;
        text?: "none" | "label" | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        fill?: "above" | "below" | undefined;
        label?: string | undefined;
        icon?: "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "editorComment" | "flag" | "heart" | "mapMarker" | "pinFilled" | "starEmpty" | "starFilled" | "tag" | "triangle" | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
        axis?: "left" | "right" | "bottom" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        decoration_position?: "auto" | "left" | "right" | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        color?: Readonly<{} & {
            color: string;
            type: "static";
        }> | undefined;
        text?: "none" | "label" | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        fill?: "above" | "below" | undefined;
        label?: string | undefined;
        icon?: "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "editorComment" | "flag" | "heart" | "mapMarker" | "pinFilled" | "starEmpty" | "starFilled" | "tag" | "triangle" | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
        axis?: "left" | "right" | "bottom" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        decoration_position?: "auto" | "left" | "right" | undefined;
    } & {
        field: string;
        operation: "max" | "min" | "median" | "average" | "standard_deviation";
    }> | Readonly<{
        color?: Readonly<{} & {
            color: string;
            type: "static";
        }> | undefined;
        text?: "none" | "label" | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        fill?: "above" | "below" | undefined;
        label?: string | undefined;
        icon?: "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "editorComment" | "flag" | "heart" | "mapMarker" | "pinFilled" | "starEmpty" | "starFilled" | "tag" | "triangle" | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
        axis?: "left" | "right" | "bottom" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        decoration_position?: "auto" | "left" | "right" | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        color?: Readonly<{} & {
            color: string;
            type: "static";
        }> | undefined;
        text?: "none" | "label" | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        fill?: "above" | "below" | undefined;
        label?: string | undefined;
        icon?: "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "editorComment" | "flag" | "heart" | "mapMarker" | "pinFilled" | "starEmpty" | "starFilled" | "tag" | "triangle" | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
        axis?: "left" | "right" | "bottom" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        decoration_position?: "auto" | "left" | "right" | undefined;
    } & {
        field: string;
        operation: "last_value";
        sort_by: string;
        show_array_values: boolean;
    }> | Readonly<{
        color?: Readonly<{} & {
            color: string;
            type: "static";
        }> | undefined;
        text?: "none" | "label" | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        fill?: "above" | "below" | undefined;
        label?: string | undefined;
        icon?: "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "editorComment" | "flag" | "heart" | "mapMarker" | "pinFilled" | "starEmpty" | "starFilled" | "tag" | "triangle" | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
        axis?: "left" | "right" | "bottom" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        decoration_position?: "auto" | "left" | "right" | undefined;
    } & {
        field: string;
        operation: "percentile";
        percentile: number;
    }> | Readonly<{
        color?: Readonly<{} & {
            color: string;
            type: "static";
        }> | undefined;
        text?: "none" | "label" | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        fill?: "above" | "below" | undefined;
        label?: string | undefined;
        icon?: "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "editorComment" | "flag" | "heart" | "mapMarker" | "pinFilled" | "starEmpty" | "starFilled" | "tag" | "triangle" | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
        axis?: "left" | "right" | "bottom" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        decoration_position?: "auto" | "left" | "right" | undefined;
    } & {
        field: string;
        operation: "percentile_rank";
        rank: number;
    }> | Readonly<{
        color?: Readonly<{} & {
            color: string;
            type: "static";
        }> | undefined;
        text?: "none" | "label" | undefined;
        fill?: "above" | "below" | undefined;
        label?: string | undefined;
        icon?: "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "editorComment" | "flag" | "heart" | "mapMarker" | "pinFilled" | "starEmpty" | "starFilled" | "tag" | "triangle" | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
        axis?: "left" | "right" | "bottom" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        decoration_position?: "auto" | "left" | "right" | undefined;
    } & {
        value: number;
        operation: "static_value";
    }> | Readonly<{
        color?: Readonly<{} & {
            color: string;
            type: "static";
        }> | undefined;
        text?: "none" | "label" | undefined;
        filter?: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }> | undefined;
        fill?: "above" | "below" | undefined;
        label?: string | undefined;
        icon?: "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "editorComment" | "flag" | "heart" | "mapMarker" | "pinFilled" | "starEmpty" | "starFilled" | "tag" | "triangle" | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
        axis?: "left" | "right" | "bottom" | undefined;
        reduced_time_range?: string | undefined;
        time_scale?: "s" | "m" | "d" | "h" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        decoration_position?: "auto" | "left" | "right" | undefined;
    } & {
        operation: "formula";
        formula: string;
    }>)[]>;
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
}>;
/**
 * Reference line layer for ES|QL queries with column-based thresholds
 */
declare const referenceLineLayerSchemaESQL: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"referenceLines">;
    thresholds: import("@kbn/config-schema").Type<Readonly<{
        color?: Readonly<{} & {
            color: string;
            type: "static";
        }> | undefined;
        text?: "none" | "label" | undefined;
        fill?: "above" | "below" | undefined;
        icon?: "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "editorComment" | "flag" | "heart" | "mapMarker" | "pinFilled" | "starEmpty" | "starFilled" | "tag" | "triangle" | undefined;
        axis?: "left" | "right" | "bottom" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        decoration_position?: "auto" | "left" | "right" | undefined;
    } & {
        operation: "value";
        column: string;
    }>[]>;
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
}>;
/**
 * Annotation layer containing query-based, point, and range annotations
 */
declare const annotationLayerSchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"annotations">;
    events: import("@kbn/config-schema").Type<(Readonly<{
        hidden?: boolean | undefined;
        color?: Readonly<{} & {
            color: string;
            type: "static";
        }> | undefined;
        text?: "none" | "label" | Readonly<{} & {
            field: string;
            type: "field";
        }> | undefined;
        label?: string | undefined;
        line?: Readonly<{} & {
            stroke_width: number;
            stroke_dash: "dashed" | "dotted" | "solid";
        }> | undefined;
        icon?: "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "editorComment" | "flag" | "heart" | "mapMarker" | "pinFilled" | "starEmpty" | "starFilled" | "tag" | "triangle" | undefined;
        extra_fields?: string[] | undefined;
    } & {
        type: "query";
        query: Readonly<{} & {
            query: string;
            language: "kuery" | "lucene";
        }>;
        time_field: string;
    }> | Readonly<{
        hidden?: boolean | undefined;
        color?: Readonly<{} & {
            color: string;
            type: "static";
        }> | undefined;
        text?: "none" | "label" | undefined;
        label?: string | undefined;
        line?: Readonly<{} & {
            stroke_width: number;
            stroke_dash: "dashed" | "dotted" | "solid";
        }> | undefined;
        icon?: "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "editorComment" | "flag" | "heart" | "mapMarker" | "pinFilled" | "starEmpty" | "starFilled" | "tag" | "triangle" | undefined;
    } & {
        timestamp: string | number;
        type: "point";
    }> | Readonly<{
        hidden?: boolean | undefined;
        color?: Readonly<{} & {
            color: string;
            type: "static";
        }> | undefined;
        fill?: "inside" | "outside" | undefined;
        label?: string | undefined;
    } & {
        type: "range";
        interval: Readonly<{} & {
            from: string | number;
            to: string | number;
        }>;
    }>)[]>;
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
}>;
/**
 * Complete XY chart state configuration with layers and visualization settings
 */
export declare const xyStateSchema: import("@kbn/config-schema").ObjectType<{
    layers: import("@kbn/config-schema").Type<(Readonly<{
        x?: Readonly<{
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
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
        }> | undefined;
        breakdown_by?: Readonly<{
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
            collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
            aggregate_first?: boolean | undefined;
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
            collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
            aggregate_first?: boolean | undefined;
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
            collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
            aggregate_first?: boolean | undefined;
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
            collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
            aggregate_first?: boolean | undefined;
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
            collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
            aggregate_first?: boolean | undefined;
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
        }> | undefined;
    } & {
        type: "area" | "line" | "bar" | "bar_stacked" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage";
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
        y: (Readonly<{
            color?: Readonly<{} & {
                color: string;
                type: "static";
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
            axis?: "left" | "right" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                color: string;
                type: "static";
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
            axis?: "left" | "right" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                color: string;
                type: "static";
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
            axis?: "left" | "right" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "max" | "min" | "median" | "average" | "standard_deviation";
        }> | Readonly<{
            color?: Readonly<{} & {
                color: string;
                type: "static";
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
            axis?: "left" | "right" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                color: string;
                type: "static";
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
            axis?: "left" | "right" | undefined;
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
                color: string;
                type: "static";
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
            axis?: "left" | "right" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "percentile";
            percentile: number;
        }> | Readonly<{
            color?: Readonly<{} & {
                color: string;
                type: "static";
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
            axis?: "left" | "right" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "percentile_rank";
            rank: number;
        }> | Readonly<{
            color?: Readonly<{} & {
                color: string;
                type: "static";
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
            axis?: "left" | "right" | undefined;
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
                color: string;
                type: "static";
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
            axis?: "left" | "right" | undefined;
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
                color: string;
                type: "static";
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
            axis?: "left" | "right" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "cumulative_sum";
        }> | Readonly<{
            color?: Readonly<{} & {
                color: string;
                type: "static";
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
            axis?: "left" | "right" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            field: string;
            operation: "counter_rate";
        }> | Readonly<{
            color?: Readonly<{} & {
                color: string;
                type: "static";
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
            axis?: "left" | "right" | undefined;
            reduced_time_range?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
        } & {
            operation: "formula";
            formula: string;
        }>)[];
        sampling: number;
        ignore_global_filters: boolean;
    }> | Readonly<{
        x?: Readonly<{} & {
            operation: "value";
            column: string;
        }> | undefined;
        breakdown_by?: Readonly<{
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
            collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
        } & {
            operation: "value";
            column: string;
        }> | undefined;
    } & {
        type: "area" | "line" | "bar" | "bar_stacked" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage";
        dataset: Readonly<{} & {
            type: "esql";
            query: string;
        }> | Readonly<{
            table?: any;
        } & {
            type: "table";
        }>;
        y: Readonly<{
            color?: Readonly<{} & {
                color: string;
                type: "static";
            }> | undefined;
            axis?: "left" | "right" | undefined;
        } & {
            operation: "value";
            column: string;
        }>[];
        sampling: number;
        ignore_global_filters: boolean;
    }> | Readonly<{} & {
        type: "referenceLines";
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
        sampling: number;
        ignore_global_filters: boolean;
        thresholds: (Readonly<{
            color?: Readonly<{} & {
                color: string;
                type: "static";
            }> | undefined;
            field?: string | undefined;
            text?: "none" | "label" | undefined;
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            label?: string | undefined;
            icon?: "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "editorComment" | "flag" | "heart" | "mapMarker" | "pinFilled" | "starEmpty" | "starFilled" | "tag" | "triangle" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            axis?: "left" | "right" | "bottom" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
            decoration_position?: "auto" | "left" | "right" | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                color: string;
                type: "static";
            }> | undefined;
            text?: "none" | "label" | undefined;
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            label?: string | undefined;
            icon?: "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "editorComment" | "flag" | "heart" | "mapMarker" | "pinFilled" | "starEmpty" | "starFilled" | "tag" | "triangle" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            axis?: "left" | "right" | "bottom" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
            decoration_position?: "auto" | "left" | "right" | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                color: string;
                type: "static";
            }> | undefined;
            text?: "none" | "label" | undefined;
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            label?: string | undefined;
            icon?: "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "editorComment" | "flag" | "heart" | "mapMarker" | "pinFilled" | "starEmpty" | "starFilled" | "tag" | "triangle" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            axis?: "left" | "right" | "bottom" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
            decoration_position?: "auto" | "left" | "right" | undefined;
        } & {
            field: string;
            operation: "max" | "min" | "median" | "average" | "standard_deviation";
        }> | Readonly<{
            color?: Readonly<{} & {
                color: string;
                type: "static";
            }> | undefined;
            text?: "none" | "label" | undefined;
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            label?: string | undefined;
            icon?: "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "editorComment" | "flag" | "heart" | "mapMarker" | "pinFilled" | "starEmpty" | "starFilled" | "tag" | "triangle" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            axis?: "left" | "right" | "bottom" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
            decoration_position?: "auto" | "left" | "right" | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                color: string;
                type: "static";
            }> | undefined;
            text?: "none" | "label" | undefined;
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            label?: string | undefined;
            icon?: "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "editorComment" | "flag" | "heart" | "mapMarker" | "pinFilled" | "starEmpty" | "starFilled" | "tag" | "triangle" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            axis?: "left" | "right" | "bottom" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
            decoration_position?: "auto" | "left" | "right" | undefined;
        } & {
            field: string;
            operation: "last_value";
            sort_by: string;
            show_array_values: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                color: string;
                type: "static";
            }> | undefined;
            text?: "none" | "label" | undefined;
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            label?: string | undefined;
            icon?: "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "editorComment" | "flag" | "heart" | "mapMarker" | "pinFilled" | "starEmpty" | "starFilled" | "tag" | "triangle" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            axis?: "left" | "right" | "bottom" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
            decoration_position?: "auto" | "left" | "right" | undefined;
        } & {
            field: string;
            operation: "percentile";
            percentile: number;
        }> | Readonly<{
            color?: Readonly<{} & {
                color: string;
                type: "static";
            }> | undefined;
            text?: "none" | "label" | undefined;
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            label?: string | undefined;
            icon?: "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "editorComment" | "flag" | "heart" | "mapMarker" | "pinFilled" | "starEmpty" | "starFilled" | "tag" | "triangle" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            axis?: "left" | "right" | "bottom" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
            decoration_position?: "auto" | "left" | "right" | undefined;
        } & {
            field: string;
            operation: "percentile_rank";
            rank: number;
        }> | Readonly<{
            color?: Readonly<{} & {
                color: string;
                type: "static";
            }> | undefined;
            text?: "none" | "label" | undefined;
            fill?: "above" | "below" | undefined;
            label?: string | undefined;
            icon?: "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "editorComment" | "flag" | "heart" | "mapMarker" | "pinFilled" | "starEmpty" | "starFilled" | "tag" | "triangle" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            axis?: "left" | "right" | "bottom" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
            decoration_position?: "auto" | "left" | "right" | undefined;
        } & {
            value: number;
            operation: "static_value";
        }> | Readonly<{
            color?: Readonly<{} & {
                color: string;
                type: "static";
            }> | undefined;
            text?: "none" | "label" | undefined;
            filter?: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            label?: string | undefined;
            icon?: "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "editorComment" | "flag" | "heart" | "mapMarker" | "pinFilled" | "starEmpty" | "starFilled" | "tag" | "triangle" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            axis?: "left" | "right" | "bottom" | undefined;
            reduced_time_range?: string | undefined;
            time_scale?: "s" | "m" | "d" | "h" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
            decoration_position?: "auto" | "left" | "right" | undefined;
        } & {
            operation: "formula";
            formula: string;
        }>)[];
    }> | Readonly<{} & {
        type: "referenceLines";
        dataset: Readonly<{} & {
            type: "esql";
            query: string;
        }> | Readonly<{
            table?: any;
        } & {
            type: "table";
        }>;
        sampling: number;
        ignore_global_filters: boolean;
        thresholds: Readonly<{
            color?: Readonly<{} & {
                color: string;
                type: "static";
            }> | undefined;
            text?: "none" | "label" | undefined;
            fill?: "above" | "below" | undefined;
            icon?: "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "editorComment" | "flag" | "heart" | "mapMarker" | "pinFilled" | "starEmpty" | "starFilled" | "tag" | "triangle" | undefined;
            axis?: "left" | "right" | "bottom" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
            decoration_position?: "auto" | "left" | "right" | undefined;
        } & {
            operation: "value";
            column: string;
        }>[];
    }> | Readonly<{} & {
        type: "annotations";
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
        events: (Readonly<{
            hidden?: boolean | undefined;
            color?: Readonly<{} & {
                color: string;
                type: "static";
            }> | undefined;
            text?: "none" | "label" | Readonly<{} & {
                field: string;
                type: "field";
            }> | undefined;
            label?: string | undefined;
            line?: Readonly<{} & {
                stroke_width: number;
                stroke_dash: "dashed" | "dotted" | "solid";
            }> | undefined;
            icon?: "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "editorComment" | "flag" | "heart" | "mapMarker" | "pinFilled" | "starEmpty" | "starFilled" | "tag" | "triangle" | undefined;
            extra_fields?: string[] | undefined;
        } & {
            type: "query";
            query: Readonly<{} & {
                query: string;
                language: "kuery" | "lucene";
            }>;
            time_field: string;
        }> | Readonly<{
            hidden?: boolean | undefined;
            color?: Readonly<{} & {
                color: string;
                type: "static";
            }> | undefined;
            text?: "none" | "label" | undefined;
            label?: string | undefined;
            line?: Readonly<{} & {
                stroke_width: number;
                stroke_dash: "dashed" | "dotted" | "solid";
            }> | undefined;
            icon?: "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "editorComment" | "flag" | "heart" | "mapMarker" | "pinFilled" | "starEmpty" | "starFilled" | "tag" | "triangle" | undefined;
        } & {
            timestamp: string | number;
            type: "point";
        }> | Readonly<{
            hidden?: boolean | undefined;
            color?: Readonly<{} & {
                color: string;
                type: "static";
            }> | undefined;
            fill?: "inside" | "outside" | undefined;
            label?: string | undefined;
        } & {
            type: "range";
            interval: Readonly<{} & {
                from: string | number;
                to: string | number;
            }>;
        }>)[];
        ignore_global_filters: boolean;
    }>)[]>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string;
        language: "kuery" | "lucene";
    }> | undefined>;
    legend: import("@kbn/config-schema").Type<Readonly<{
        size?: "small" | "medium" | "large" | "xlarge" | undefined;
        position?: "left" | "right" | "top" | "bottom" | undefined;
        statistics?: ("total" | "max" | "min" | "count" | "median" | "range" | "avg" | "variance" | "difference" | "last_value" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value")[] | undefined;
        inside?: false | undefined;
        layout?: "list" | undefined;
        truncate_after_lines?: number | undefined;
    } & {
        visibility: "hidden" | "auto" | "visible";
    }> | Readonly<{
        columns?: number | undefined;
        statistics?: ("total" | "max" | "min" | "count" | "median" | "range" | "avg" | "variance" | "difference" | "last_value" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value")[] | undefined;
        alignment?: "top_left" | "bottom_right" | "top_right" | "bottom_left" | undefined;
        truncate_after_lines?: number | undefined;
    } & {
        visibility: "hidden" | "auto" | "visible";
        inside: true;
    }> | undefined>;
    fitting: import("@kbn/config-schema").Type<Readonly<{
        dotted?: boolean | undefined;
        end_value?: "none" | "nearest" | "zero" | undefined;
    } & {
        type: "none" | "nearest" | "average" | "linear" | "zero" | "carry" | "lookahead";
    }> | undefined>;
    axis: import("@kbn/config-schema").Type<Readonly<{
        left?: Readonly<{
            title?: Readonly<{
                value?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            grid?: boolean | undefined;
            scale?: "log" | "time" | "linear" | "sqrt" | undefined;
            ticks?: boolean | undefined;
            extent?: Readonly<{
                integer_rounding?: boolean | undefined;
            } & {
                type: "full";
            }> | Readonly<{} & {
                type: "focus";
            }> | Readonly<{
                integer_rounding?: boolean | undefined;
            } & {
                type: "custom";
                end: number;
                start: number;
            }> | undefined;
            label_orientation?: "horizontal" | "vertical" | "angled" | undefined;
        } & {}> | undefined;
        right?: Readonly<{
            title?: Readonly<{
                value?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            grid?: boolean | undefined;
            scale?: "log" | "time" | "linear" | "sqrt" | undefined;
            ticks?: boolean | undefined;
            extent?: Readonly<{
                integer_rounding?: boolean | undefined;
            } & {
                type: "full";
            }> | Readonly<{} & {
                type: "focus";
            }> | Readonly<{
                integer_rounding?: boolean | undefined;
            } & {
                type: "custom";
                end: number;
                start: number;
            }> | undefined;
            label_orientation?: "horizontal" | "vertical" | "angled" | undefined;
        } & {}> | undefined;
        x?: Readonly<{
            title?: Readonly<{
                value?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            grid?: boolean | undefined;
            scale?: "linear" | "ordinal" | "temporal" | undefined;
            ticks?: boolean | undefined;
            extent?: Readonly<{
                integer_rounding?: boolean | undefined;
            } & {
                type: "full";
            }> | Readonly<{
                integer_rounding?: boolean | undefined;
            } & {
                type: "custom";
                end: number;
                start: number;
            }> | undefined;
            label_orientation?: "horizontal" | "vertical" | "angled" | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
    decorations: import("@kbn/config-schema").Type<Readonly<{
        show_end_zones?: boolean | undefined;
        show_current_time_marker?: boolean | undefined;
        point_visibility?: "auto" | "never" | "always" | undefined;
        line_interpolation?: "linear" | "smooth" | "stepped" | undefined;
        minimum_bar_height?: number | undefined;
        show_value_labels?: boolean | undefined;
        fill_opacity?: number | undefined;
    } & {}> | undefined>;
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
    type: import("@kbn/config-schema").Type<"xy">;
}>;
export declare const xyStateSchemaESQL: import("@kbn/config-schema").ObjectType<{
    layers: import("@kbn/config-schema").Type<Readonly<{
        x?: Readonly<{} & {
            operation: "value";
            column: string;
        }> | undefined;
        breakdown_by?: Readonly<{
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
            collapse_by?: "max" | "min" | "avg" | "sum" | undefined;
        } & {
            operation: "value";
            column: string;
        }> | undefined;
    } & {
        type: "area" | "line" | "bar" | "bar_stacked" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage";
        dataset: Readonly<{} & {
            type: "esql";
            query: string;
        }> | Readonly<{
            table?: any;
        } & {
            type: "table";
        }>;
        y: Readonly<{
            color?: Readonly<{} & {
                color: string;
                type: "static";
            }> | undefined;
            axis?: "left" | "right" | undefined;
        } & {
            operation: "value";
            column: string;
        }>[];
        sampling: number;
        ignore_global_filters: boolean;
    }>[]>;
    legend: import("@kbn/config-schema").Type<Readonly<{
        size?: "small" | "medium" | "large" | "xlarge" | undefined;
        position?: "left" | "right" | "top" | "bottom" | undefined;
        statistics?: ("total" | "max" | "min" | "count" | "median" | "range" | "avg" | "variance" | "difference" | "last_value" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value")[] | undefined;
        inside?: false | undefined;
        layout?: "list" | undefined;
        truncate_after_lines?: number | undefined;
    } & {
        visibility: "hidden" | "auto" | "visible";
    }> | Readonly<{
        columns?: number | undefined;
        statistics?: ("total" | "max" | "min" | "count" | "median" | "range" | "avg" | "variance" | "difference" | "last_value" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value")[] | undefined;
        alignment?: "top_left" | "bottom_right" | "top_right" | "bottom_left" | undefined;
        truncate_after_lines?: number | undefined;
    } & {
        visibility: "hidden" | "auto" | "visible";
        inside: true;
    }> | undefined>;
    fitting: import("@kbn/config-schema").Type<Readonly<{
        dotted?: boolean | undefined;
        end_value?: "none" | "nearest" | "zero" | undefined;
    } & {
        type: "none" | "nearest" | "average" | "linear" | "zero" | "carry" | "lookahead";
    }> | undefined>;
    axis: import("@kbn/config-schema").Type<Readonly<{
        left?: Readonly<{
            title?: Readonly<{
                value?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            grid?: boolean | undefined;
            scale?: "log" | "time" | "linear" | "sqrt" | undefined;
            ticks?: boolean | undefined;
            extent?: Readonly<{
                integer_rounding?: boolean | undefined;
            } & {
                type: "full";
            }> | Readonly<{} & {
                type: "focus";
            }> | Readonly<{
                integer_rounding?: boolean | undefined;
            } & {
                type: "custom";
                end: number;
                start: number;
            }> | undefined;
            label_orientation?: "horizontal" | "vertical" | "angled" | undefined;
        } & {}> | undefined;
        right?: Readonly<{
            title?: Readonly<{
                value?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            grid?: boolean | undefined;
            scale?: "log" | "time" | "linear" | "sqrt" | undefined;
            ticks?: boolean | undefined;
            extent?: Readonly<{
                integer_rounding?: boolean | undefined;
            } & {
                type: "full";
            }> | Readonly<{} & {
                type: "focus";
            }> | Readonly<{
                integer_rounding?: boolean | undefined;
            } & {
                type: "custom";
                end: number;
                start: number;
            }> | undefined;
            label_orientation?: "horizontal" | "vertical" | "angled" | undefined;
        } & {}> | undefined;
        x?: Readonly<{
            title?: Readonly<{
                value?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            grid?: boolean | undefined;
            scale?: "linear" | "ordinal" | "temporal" | undefined;
            ticks?: boolean | undefined;
            extent?: Readonly<{
                integer_rounding?: boolean | undefined;
            } & {
                type: "full";
            }> | Readonly<{
                integer_rounding?: boolean | undefined;
            } & {
                type: "custom";
                end: number;
                start: number;
            }> | undefined;
            label_orientation?: "horizontal" | "vertical" | "angled" | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
    decorations: import("@kbn/config-schema").Type<Readonly<{
        show_end_zones?: boolean | undefined;
        show_current_time_marker?: boolean | undefined;
        point_visibility?: "auto" | "never" | "always" | undefined;
        line_interpolation?: "linear" | "smooth" | "stepped" | undefined;
        minimum_bar_height?: number | undefined;
        show_value_labels?: boolean | undefined;
        fill_opacity?: number | undefined;
    } & {}> | undefined>;
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
    type: import("@kbn/config-schema").Type<"xy">;
}>;
export type XScaleSchemaType = TypeOf<typeof xScaleSchema>;
export type XYState = TypeOf<typeof xyStateSchema>;
export type XYStateESQL = TypeOf<typeof xyStateSchemaESQL>;
export type DataLayerTypeESQL = TypeOf<typeof xyDataLayerSchemaESQL>;
export type DataLayerTypeNoESQL = TypeOf<typeof xyDataLayerSchemaNoESQL>;
export type DataLayerType = DataLayerTypeNoESQL | DataLayerTypeESQL;
export type ReferenceLineLayerTypeESQL = TypeOf<typeof referenceLineLayerSchemaESQL>;
export type ReferenceLineLayerTypeNoESQL = TypeOf<typeof referenceLineLayerSchemaNoESQL>;
export type ReferenceLineLayerType = ReferenceLineLayerTypeNoESQL | ReferenceLineLayerTypeESQL;
export type AnnotationLayerType = TypeOf<typeof annotationLayerSchema>;
export type LayerTypeESQL = DataLayerTypeESQL | ReferenceLineLayerTypeESQL;
export type LayerTypeNoESQL = DataLayerTypeNoESQL | ReferenceLineLayerTypeNoESQL | AnnotationLayerType;
export type XYDecorations = TypeOf<typeof decorationsSchema>;
export {};
