import type { TypeOf } from '@kbn/config-schema';
import type { legendSizeSchema } from './shared';
/**
 * Statistical functions that can be displayed in chart legend for data series
 */
export declare const statisticsSchema: import("@kbn/config-schema").Type<"range" | "min" | "max" | "count" | "total" | "avg" | "median" | "difference" | "distinct_count" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value">;
export declare const statisticsOptionsSize = 17;
/**
 * Y-axis domain configuration defining how the axis bounds are calculated
 */
declare const yDomainSchema: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<{
    type: import("@kbn/config-schema").Type<"full">;
    rounding: import("@kbn/config-schema").Type<boolean | undefined>;
} | {
    type: import("@kbn/config-schema").Type<"fit">;
    rounding: import("@kbn/config-schema").Type<boolean | undefined>;
} | {
    type: import("@kbn/config-schema").Type<"custom">;
    min: import("@kbn/config-schema").Type<number>;
    max: import("@kbn/config-schema").Type<number>;
    rounding: import("@kbn/config-schema").Type<boolean | undefined>;
}>>;
export type YDomainSchemaType = TypeOf<typeof yDomainSchema>;
/**
 * Y-axis scale type for data transformation
 */
declare const yScaleSchema: import("@kbn/config-schema").Type<"log" | "linear" | "sqrt">;
export type YScaleSchemaType = TypeOf<typeof yScaleSchema>;
/**
 * Common axis configuration properties shared across X and Y axes
 */
export declare const sharedAxisSchema: {
    title: import("@kbn/config-schema").Type<Readonly<{
        text?: string | undefined;
        visible?: boolean | undefined;
    } & {}> | undefined>;
    ticks: import("@kbn/config-schema").Type<Readonly<{} & {
        visible: boolean;
    }> | undefined>;
    grid: import("@kbn/config-schema").Type<Readonly<{} & {
        visible: boolean;
    }> | undefined>;
    labels: import("@kbn/config-schema").Type<Readonly<{
        orientation?: "horizontal" | "vertical" | "angled" | undefined;
    } & {}> | undefined>;
};
declare const yAxisSchema: import("@kbn/config-schema").ObjectType<{
    scale: import("@kbn/config-schema").Type<"log" | "linear" | "sqrt" | undefined>;
    domain: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<{
        type: import("@kbn/config-schema").Type<"full">;
        rounding: import("@kbn/config-schema").Type<boolean | undefined>;
    } | {
        type: import("@kbn/config-schema").Type<"fit">;
        rounding: import("@kbn/config-schema").Type<boolean | undefined>;
    } | {
        type: import("@kbn/config-schema").Type<"custom">;
        min: import("@kbn/config-schema").Type<number>;
        max: import("@kbn/config-schema").Type<number>;
        rounding: import("@kbn/config-schema").Type<boolean | undefined>;
    }> | undefined>;
    title: import("@kbn/config-schema").Type<Readonly<{
        text?: string | undefined;
        visible?: boolean | undefined;
    } & {}> | undefined>;
    ticks: import("@kbn/config-schema").Type<Readonly<{} & {
        visible: boolean;
    }> | undefined>;
    grid: import("@kbn/config-schema").Type<Readonly<{} & {
        visible: boolean;
    }> | undefined>;
    labels: import("@kbn/config-schema").Type<Readonly<{
        orientation?: "horizontal" | "vertical" | "angled" | undefined;
    } & {}> | undefined>;
}>;
export type YAxisSchemaType = TypeOf<typeof yAxisSchema>;
declare const xAxisSchema: import("@kbn/config-schema").ObjectType<{
    scale: import("@kbn/config-schema").Type<"linear" | "ordinal" | "temporal" | undefined>;
    domain: import("@kbn/config-schema").Type<Readonly<{
        rounding?: boolean | undefined;
    } & {
        type: "fit";
    }> | Readonly<{
        rounding?: boolean | undefined;
    } & {
        type: "custom";
        min: number;
        max: number;
    }> | undefined>;
    title: import("@kbn/config-schema").Type<Readonly<{
        text?: string | undefined;
        visible?: boolean | undefined;
    } & {}> | undefined>;
    ticks: import("@kbn/config-schema").Type<Readonly<{} & {
        visible: boolean;
    }> | undefined>;
    grid: import("@kbn/config-schema").Type<Readonly<{} & {
        visible: boolean;
    }> | undefined>;
    labels: import("@kbn/config-schema").Type<Readonly<{
        orientation?: "horizontal" | "vertical" | "angled" | undefined;
    } & {}> | undefined>;
}>;
export type XAxisSchemaType = TypeOf<typeof xAxisSchema>;
/**
 * Chart types available for data layers in XY visualizations
 */
export declare const xyDataLayerSharedSchema: {
    type: import("@kbn/config-schema").Type<"area" | "line" | "bar_stacked" | "bar" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage">;
};
declare const XY_API_LINE_INTERPOLATION: {
    readonly LINEAR: "linear";
    readonly SMOOTH: "smooth";
    readonly STEPPED: "stepped";
};
export type XYApiLineInterpolation = typeof XY_API_LINE_INTERPOLATION;
/**
 * Legend schema variants
 */
declare const xyLegendOutsideHorizontalSchema: import("@kbn/config-schema").ObjectType<{
    placement: import("@kbn/config-schema").Type<"outside" | undefined>;
    layout: import("@kbn/config-schema").Type<Readonly<{
        truncate?: Readonly<{
            enabled?: boolean | undefined;
            max_lines?: number | undefined;
        } & {}> | undefined;
    } & {
        type: "grid";
    }> | Readonly<{} & {
        type: "list";
    }> | undefined>;
    position: import("@kbn/config-schema").Type<"top" | "bottom" | undefined>;
    visibility: import("@kbn/config-schema").Type<"hidden" | "auto" | "visible" | undefined>;
    statistics: import("@kbn/config-schema").Type<("range" | "min" | "max" | "count" | "total" | "avg" | "median" | "difference" | "distinct_count" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined>;
    series_header: import("@kbn/config-schema").Type<Readonly<{
        text?: string | undefined;
        visible?: boolean | undefined;
    } & {}> | undefined>;
}>;
declare const xyLegendOutsideVerticalSchema: import("@kbn/config-schema").ObjectType<{
    placement: import("@kbn/config-schema").Type<"outside" | undefined>;
    layout: import("@kbn/config-schema").Type<Readonly<{
        truncate?: Readonly<{
            enabled?: boolean | undefined;
            max_lines?: number | undefined;
        } & {}> | undefined;
    } & {
        type: "grid";
    }> | undefined>;
    position: import("@kbn/config-schema").Type<"left" | "right" | undefined>;
    size: import("@kbn/config-schema").Type<"s" | "auto" | "m" | "l" | "xl" | undefined>;
    visibility: import("@kbn/config-schema").Type<"hidden" | "auto" | "visible" | undefined>;
    statistics: import("@kbn/config-schema").Type<("range" | "min" | "max" | "count" | "total" | "avg" | "median" | "difference" | "distinct_count" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined>;
    series_header: import("@kbn/config-schema").Type<Readonly<{
        text?: string | undefined;
        visible?: boolean | undefined;
    } & {}> | undefined>;
}>;
declare const xyLegendInsideSchema: import("@kbn/config-schema").ObjectType<{
    placement: import("@kbn/config-schema").Type<"inside">;
    layout: import("@kbn/config-schema").Type<Readonly<{
        truncate?: Readonly<{
            enabled?: boolean | undefined;
            max_lines?: number | undefined;
        } & {}> | undefined;
    } & {
        type: "grid";
    }> | undefined>;
    columns: import("@kbn/config-schema").Type<number | undefined>;
    position: import("@kbn/config-schema").Type<"top_left" | "bottom_right" | "top_right" | "bottom_left" | undefined>;
    visibility: import("@kbn/config-schema").Type<"hidden" | "auto" | "visible" | undefined>;
    statistics: import("@kbn/config-schema").Type<("range" | "min" | "max" | "count" | "total" | "avg" | "median" | "difference" | "distinct_count" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined>;
    series_header: import("@kbn/config-schema").Type<Readonly<{
        text?: string | undefined;
        visible?: boolean | undefined;
    } & {}> | undefined>;
}>;
/**
 * Data layer configuration for standard (non-ES|QL) queries with breakdown and metrics
 */
declare const xyDataLayerSchemaNoESQL: import("@kbn/config-schema").ObjectType<{
    breakdown_by: import("@kbn/config-schema").Type<Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
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
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
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
        collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
        aggregate_first?: boolean | undefined;
    } & {
        field: string;
        operation: "date_histogram";
        suggested_interval: string;
        use_original_time_range: boolean;
        include_empty_rows: boolean;
    }> | Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
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
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
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
            type: "custom";
            pattern: string;
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
            type: "alphabetical";
            direction: "desc" | "asc";
        }> | Readonly<{} & {
            type: "rare";
            max: number;
        }> | Readonly<{} & {
            type: "significant";
        }> | Readonly<{} & {
            type: "metric";
            direction: "desc" | "asc";
            metric_index: number;
        }> | Readonly<{} & {
            type: "custom";
            field: string;
            direction: "desc" | "asc";
            operation: "min" | "max" | "sum" | "average" | "median" | "last_value" | "unique_count" | "standard_deviation";
        }> | Readonly<{
            field?: string | undefined;
        } & {
            type: "custom";
            direction: "desc" | "asc";
            operation: "count";
        }> | Readonly<{} & {
            type: "custom";
            field: string;
            direction: "desc" | "asc";
            percentile: number;
            operation: "percentile";
        }> | Readonly<{} & {
            type: "custom";
            field: string;
            direction: "desc" | "asc";
            rank: number;
            operation: "percentile_rank";
        }> | undefined;
        collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
        aggregate_first?: boolean | undefined;
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
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
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
            type: "custom";
            pattern: string;
        }> | undefined;
        collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
        aggregate_first?: boolean | undefined;
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
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
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
            type: "custom";
            pattern: string;
        }> | undefined;
        collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
        aggregate_first?: boolean | undefined;
    } & {
        field: string;
        ranges: Readonly<{
            label?: string | undefined;
            lte?: number | undefined;
            gt?: number | undefined;
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
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mapping: Readonly<{} & {
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
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
        collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
        aggregate_first?: boolean | undefined;
    } & {
        filters: Readonly<{
            label?: string | undefined;
        } & {
            filter: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }>;
        }>[];
        operation: "filters";
    }> | undefined>;
    y: import("@kbn/config-schema").Type<(Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        label?: string | undefined;
        field?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "y2" | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
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
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "y2" | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
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
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "y2" | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
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
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "y2" | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
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
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "y2" | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
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
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "y2" | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
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
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "y2" | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
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
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "y2" | undefined;
    } & {
        operation: "differences";
        of: Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            label?: string | undefined;
            field?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
                decimals: number;
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                type: "bytes" | "bits";
                decimals: number;
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                type: "duration";
                from: string;
                to: string;
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "min" | "max" | "average" | "median" | "standard_deviation";
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
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
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            percentile: number;
            operation: "percentile";
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            rank: number;
            operation: "percentile_rank";
        }>;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
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
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "y2" | undefined;
    } & {
        window: number;
        operation: "moving_average";
        of: Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            label?: string | undefined;
            field?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
                decimals: number;
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                type: "bytes" | "bits";
                decimals: number;
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                type: "duration";
                from: string;
                to: string;
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "min" | "max" | "average" | "median" | "standard_deviation";
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
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
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            percentile: number;
            operation: "percentile";
        }> | Readonly<{
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
        } & {
            field: string;
            rank: number;
            operation: "percentile_rank";
        }>;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
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
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "y2" | undefined;
    } & {
        field: string;
        operation: "cumulative_sum";
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
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
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "y2" | undefined;
    } & {
        field: string;
        operation: "counter_rate";
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
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
            type: "custom";
            pattern: string;
        }> | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        axis?: "y" | "y2" | undefined;
    } & {
        formula: string;
        operation: "formula";
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
            type: "custom";
            pattern: string;
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
            type: "alphabetical";
            direction: "desc" | "asc";
        }> | Readonly<{} & {
            type: "rare";
            max: number;
        }> | Readonly<{} & {
            type: "significant";
        }> | Readonly<{} & {
            type: "metric";
            direction: "desc" | "asc";
            metric_index: number;
        }> | Readonly<{} & {
            type: "custom";
            field: string;
            direction: "desc" | "asc";
            operation: "min" | "max" | "sum" | "average" | "median" | "last_value" | "unique_count" | "standard_deviation";
        }> | Readonly<{
            field?: string | undefined;
        } & {
            type: "custom";
            direction: "desc" | "asc";
            operation: "count";
        }> | Readonly<{} & {
            type: "custom";
            field: string;
            direction: "desc" | "asc";
            percentile: number;
            operation: "percentile";
        }> | Readonly<{} & {
            type: "custom";
            field: string;
            direction: "desc" | "asc";
            rank: number;
            operation: "percentile_rank";
        }> | undefined;
    } & {
        fields: string[];
        limit: number;
        operation: "terms";
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
            type: "custom";
            pattern: string;
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
            type: "custom";
            pattern: string;
        }> | undefined;
    } & {
        field: string;
        ranges: Readonly<{
            label?: string | undefined;
            lte?: number | undefined;
            gt?: number | undefined;
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
                language: "kql" | "lucene";
            }>;
        }>[];
        operation: "filters";
    }> | undefined>;
    type: import("@kbn/config-schema").Type<"area" | "line" | "bar_stacked" | "bar" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage">;
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
            script?: string | undefined;
            format?: Readonly<{
                params?: any;
            } & {
                type: string;
            }> | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
        } & {
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
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
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
            }>>;
        }>> | undefined>;
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
            unassigned?: Readonly<{
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
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
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
            type: "custom";
            pattern: string;
        }> | undefined;
        collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
    } & {
        column: string;
    }> | undefined>;
    y: import("@kbn/config-schema").Type<Readonly<{
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
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        axis?: "y" | "y2" | undefined;
    } & {
        column: string;
    }>[]>;
    x: import("@kbn/config-schema").Type<Readonly<{
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
            type: "custom";
            pattern: string;
        }> | undefined;
    } & {
        column: string;
    }> | undefined>;
    type: import("@kbn/config-schema").Type<"area" | "line" | "bar_stacked" | "bar" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage">;
    data_source: import("@kbn/config-schema").ObjectType<{
        type: import("@kbn/config-schema").Type<"esql">;
        query: import("@kbn/config-schema").Type<string>;
    }>;
    ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
    sampling: import("@kbn/config-schema").Type<number>;
}>;
/**
 * Reference line layer for standard queries with threshold values
 */
declare const referenceLineLayerSchemaNoESQL: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"reference_lines">;
    thresholds: import("@kbn/config-schema").Type<(Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        fill?: "above" | "below" | undefined;
        label?: string | undefined;
        field?: string | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        position?: "auto" | "left" | "right" | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "x" | "y2" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        fill?: "above" | "below" | undefined;
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
            type: "custom";
            pattern: string;
        }> | undefined;
        position?: "auto" | "left" | "right" | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "x" | "y2" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        fill?: "above" | "below" | undefined;
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
            type: "custom";
            pattern: string;
        }> | undefined;
        position?: "auto" | "left" | "right" | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "x" | "y2" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        fill?: "above" | "below" | undefined;
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
            type: "custom";
            pattern: string;
        }> | undefined;
        position?: "auto" | "left" | "right" | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "x" | "y2" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        fill?: "above" | "below" | undefined;
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
            type: "custom";
            pattern: string;
        }> | undefined;
        position?: "auto" | "left" | "right" | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "x" | "y2" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
    } & {
        field: string;
        operation: "last_value";
        time_field: string;
        multi_value: boolean;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        fill?: "above" | "below" | undefined;
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
            type: "custom";
            pattern: string;
        }> | undefined;
        position?: "auto" | "left" | "right" | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "x" | "y2" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        fill?: "above" | "below" | undefined;
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
            type: "custom";
            pattern: string;
        }> | undefined;
        position?: "auto" | "left" | "right" | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "x" | "y2" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        fill?: "above" | "below" | undefined;
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
            type: "custom";
            pattern: string;
        }> | undefined;
        position?: "auto" | "left" | "right" | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        axis?: "y" | "x" | "y2" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
    } & {
        value: number;
        operation: "static_value";
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        fill?: "above" | "below" | undefined;
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
            type: "custom";
            pattern: string;
        }> | undefined;
        position?: "auto" | "left" | "right" | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        time_scale?: "s" | "h" | "d" | "m" | undefined;
        reduced_time_range?: string | undefined;
        axis?: "y" | "x" | "y2" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
    } & {
        formula: string;
        operation: "formula";
    }>)[]>;
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
            script?: string | undefined;
            format?: Readonly<{
                params?: any;
            } & {
                type: string;
            }> | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
        } & {
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
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
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
            }>>;
        }>> | undefined>;
    }>>;
    ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
    sampling: import("@kbn/config-schema").Type<number>;
}>;
/**
 * Reference line layer for ES|QL queries with column-based thresholds
 */
declare const referenceLineLayerSchemaESQL: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"reference_lines">;
    thresholds: import("@kbn/config-schema").Type<Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        fill?: "above" | "below" | undefined;
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
            type: "custom";
            pattern: string;
        }> | undefined;
        position?: "auto" | "left" | "right" | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        axis?: "y" | "x" | "y2" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
    } & {
        column: string;
    }>[]>;
    data_source: import("@kbn/config-schema").ObjectType<{
        type: import("@kbn/config-schema").Type<"esql">;
        query: import("@kbn/config-schema").Type<string>;
    }>;
    ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
    sampling: import("@kbn/config-schema").Type<number>;
}>;
/**
 * Annotation layer containing query-based, point, and range annotations (by-value)
 */
declare const annotationLayerByValueSchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"annotations">;
    events: import("@kbn/config-schema").Type<(Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        text?: Readonly<{
            field?: string | undefined;
        } & {
            visible: boolean;
        }> | undefined;
        label?: string | undefined;
        line?: Readonly<{} & {
            stroke_width: number;
            stroke_dash: "dashed" | "dotted" | "solid";
        }> | undefined;
        visible?: boolean | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        extra_fields?: string[] | undefined;
    } & {
        type: "query";
        query: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }>;
        time_field: string;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        label?: string | undefined;
        line?: Readonly<{} & {
            stroke_width: number;
            stroke_dash: "dashed" | "dotted" | "solid";
        }> | undefined;
        visible?: boolean | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
    } & {
        type: "point";
        timestamp: string | number;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        fill?: "inside" | "outside" | undefined;
        label?: string | undefined;
        visible?: boolean | undefined;
    } & {
        type: "range";
        interval: Readonly<{} & {
            from: string | number;
            to: string | number;
        }>;
    }>)[]>;
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
            script?: string | undefined;
            format?: Readonly<{
                params?: any;
            } & {
                type: string;
            }> | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
        } & {
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
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
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
            }>>;
        }>> | undefined>;
    }>>;
    ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
}>;
/**
 * By-reference annotation layer that links to a library annotation group
 */
declare const annotationByRefLayerSchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"annotation_group">;
    group_id: import("@kbn/config-schema").Type<string>;
}>;
declare const annotationLayerSchema: import("./utils/object_union").ObjectUnionType<[import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"annotations">;
    events: import("@kbn/config-schema").Type<(Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        text?: Readonly<{
            field?: string | undefined;
        } & {
            visible: boolean;
        }> | undefined;
        label?: string | undefined;
        line?: Readonly<{} & {
            stroke_width: number;
            stroke_dash: "dashed" | "dotted" | "solid";
        }> | undefined;
        visible?: boolean | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        extra_fields?: string[] | undefined;
    } & {
        type: "query";
        query: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }>;
        time_field: string;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        label?: string | undefined;
        line?: Readonly<{} & {
            stroke_width: number;
            stroke_dash: "dashed" | "dotted" | "solid";
        }> | undefined;
        visible?: boolean | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
    } & {
        type: "point";
        timestamp: string | number;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        fill?: "inside" | "outside" | undefined;
        label?: string | undefined;
        visible?: boolean | undefined;
    } & {
        type: "range";
        interval: Readonly<{} & {
            from: string | number;
            to: string | number;
        }>;
    }>)[]>;
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
            script?: string | undefined;
            format?: Readonly<{
                params?: any;
            } & {
                type: string;
            }> | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
        } & {
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
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
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
            }>>;
        }>> | undefined>;
    }>>;
    ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
}>, import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"annotation_group">;
    group_id: import("@kbn/config-schema").Type<string>;
}>], Readonly<{} & {
    type: "annotations";
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
            script?: string | undefined;
            format?: Readonly<{
                params?: any;
            } & {
                type: string;
            }> | undefined;
            custom_label?: string | undefined;
            custom_description?: string | undefined;
        } & {
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
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
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
            }>>;
        }>> | undefined>;
    }>;
    events: (Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        text?: Readonly<{
            field?: string | undefined;
        } & {
            visible: boolean;
        }> | undefined;
        label?: string | undefined;
        line?: Readonly<{} & {
            stroke_width: number;
            stroke_dash: "dashed" | "dotted" | "solid";
        }> | undefined;
        visible?: boolean | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        extra_fields?: string[] | undefined;
    } & {
        type: "query";
        query: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }>;
        time_field: string;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        label?: string | undefined;
        line?: Readonly<{} & {
            stroke_width: number;
            stroke_dash: "dashed" | "dotted" | "solid";
        }> | undefined;
        visible?: boolean | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
    } & {
        type: "point";
        timestamp: string | number;
    }> | Readonly<{
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        fill?: "inside" | "outside" | undefined;
        label?: string | undefined;
        visible?: boolean | undefined;
    } & {
        type: "range";
        interval: Readonly<{} & {
            from: string | number;
            to: string | number;
        }>;
    }>)[];
    ignore_global_filters: boolean;
}> | Readonly<{} & {
    type: "annotation_group";
    group_id: string;
}>>;
declare const xyLayerUnionESQL: import("./utils/object_union").ObjectUnionType<[import("@kbn/config-schema").ObjectType<{
    breakdown_by: import("@kbn/config-schema").Type<Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
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
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
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
            type: "custom";
            pattern: string;
        }> | undefined;
        collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
    } & {
        column: string;
    }> | undefined>;
    y: import("@kbn/config-schema").Type<Readonly<{
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
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        axis?: "y" | "y2" | undefined;
    } & {
        column: string;
    }>[]>;
    x: import("@kbn/config-schema").Type<Readonly<{
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
            type: "custom";
            pattern: string;
        }> | undefined;
    } & {
        column: string;
    }> | undefined>;
    type: import("@kbn/config-schema").Type<"area" | "line" | "bar_stacked" | "bar" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage">;
    data_source: import("@kbn/config-schema").ObjectType<{
        type: import("@kbn/config-schema").Type<"esql">;
        query: import("@kbn/config-schema").Type<string>;
    }>;
    ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
    sampling: import("@kbn/config-schema").Type<number>;
}>], Readonly<{
    x?: Readonly<{
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
            type: "custom";
            pattern: string;
        }> | undefined;
    } & {
        column: string;
    }> | undefined;
    breakdown_by?: Readonly<{
        color?: Readonly<{
            unassigned?: Readonly<{
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
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    type: "from_palette";
                    index: number;
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[];
            palette: string;
            mode: "categorical";
        }> | Readonly<{
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            sort?: "desc" | "asc" | undefined;
            unassigned?: Readonly<{
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
            type: "custom";
            pattern: string;
        }> | undefined;
        collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
    } & {
        column: string;
    }> | undefined;
} & {
    type: "area" | "line" | "bar_stacked" | "bar" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage";
    y: Readonly<{
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
            type: "number" | "percent";
            compact: boolean;
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "bytes" | "bits";
            decimals: number;
        }> | Readonly<{
            suffix?: string | undefined;
        } & {
            type: "duration";
            from: string;
            to: string;
        }> | Readonly<{} & {
            type: "custom";
            pattern: string;
        }> | undefined;
        axis?: "y" | "y2" | undefined;
    } & {
        column: string;
    }>[];
    data_source: Readonly<{} & {
        type: "esql";
        query: string;
    }>;
    sampling: number;
    ignore_global_filters: boolean;
}>>;
/**
 * XY chart state for DSL layers
 */
export declare const xyConfigSchemaNoESQL: import("@kbn/config-schema").ObjectType<{
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
                type: "custom";
                pattern: string;
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
                type: "alphabetical";
                direction: "desc" | "asc";
            }> | Readonly<{} & {
                type: "rare";
                max: number;
            }> | Readonly<{} & {
                type: "significant";
            }> | Readonly<{} & {
                type: "metric";
                direction: "desc" | "asc";
                metric_index: number;
            }> | Readonly<{} & {
                type: "custom";
                field: string;
                direction: "desc" | "asc";
                operation: "min" | "max" | "sum" | "average" | "median" | "last_value" | "unique_count" | "standard_deviation";
            }> | Readonly<{
                field?: string | undefined;
            } & {
                type: "custom";
                direction: "desc" | "asc";
                operation: "count";
            }> | Readonly<{} & {
                type: "custom";
                field: string;
                direction: "desc" | "asc";
                percentile: number;
                operation: "percentile";
            }> | Readonly<{} & {
                type: "custom";
                field: string;
                direction: "desc" | "asc";
                rank: number;
                operation: "percentile_rank";
            }> | undefined;
        } & {
            fields: string[];
            limit: number;
            operation: "terms";
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
                type: "custom";
                pattern: string;
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
                type: "custom";
                pattern: string;
            }> | undefined;
        } & {
            field: string;
            ranges: Readonly<{
                label?: string | undefined;
                lte?: number | undefined;
                gt?: number | undefined;
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
                    language: "kql" | "lucene";
                }>;
            }>[];
            operation: "filters";
        }> | undefined;
        breakdown_by?: Readonly<{
            color?: Readonly<{
                unassigned?: Readonly<{
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
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[];
                palette: string;
                mode: "categorical";
            }> | Readonly<{
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                sort?: "desc" | "asc" | undefined;
                unassigned?: Readonly<{
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
            collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
            aggregate_first?: boolean | undefined;
        } & {
            field: string;
            operation: "date_histogram";
            suggested_interval: string;
            use_original_time_range: boolean;
            include_empty_rows: boolean;
        }> | Readonly<{
            color?: Readonly<{
                unassigned?: Readonly<{
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
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[];
                palette: string;
                mode: "categorical";
            }> | Readonly<{
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                sort?: "desc" | "asc" | undefined;
                unassigned?: Readonly<{
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
                type: "custom";
                pattern: string;
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
                type: "alphabetical";
                direction: "desc" | "asc";
            }> | Readonly<{} & {
                type: "rare";
                max: number;
            }> | Readonly<{} & {
                type: "significant";
            }> | Readonly<{} & {
                type: "metric";
                direction: "desc" | "asc";
                metric_index: number;
            }> | Readonly<{} & {
                type: "custom";
                field: string;
                direction: "desc" | "asc";
                operation: "min" | "max" | "sum" | "average" | "median" | "last_value" | "unique_count" | "standard_deviation";
            }> | Readonly<{
                field?: string | undefined;
            } & {
                type: "custom";
                direction: "desc" | "asc";
                operation: "count";
            }> | Readonly<{} & {
                type: "custom";
                field: string;
                direction: "desc" | "asc";
                percentile: number;
                operation: "percentile";
            }> | Readonly<{} & {
                type: "custom";
                field: string;
                direction: "desc" | "asc";
                rank: number;
                operation: "percentile_rank";
            }> | undefined;
            collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
            aggregate_first?: boolean | undefined;
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
                    type: "color_code";
                    value: string;
                }> | undefined;
            } & {
                mapping: Readonly<{} & {
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[];
                palette: string;
                mode: "categorical";
            }> | Readonly<{
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                sort?: "desc" | "asc" | undefined;
                unassigned?: Readonly<{
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
                type: "custom";
                pattern: string;
            }> | undefined;
            collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
            aggregate_first?: boolean | undefined;
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
                    type: "color_code";
                    value: string;
                }> | undefined;
            } & {
                mapping: Readonly<{} & {
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[];
                palette: string;
                mode: "categorical";
            }> | Readonly<{
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                sort?: "desc" | "asc" | undefined;
                unassigned?: Readonly<{
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
                type: "custom";
                pattern: string;
            }> | undefined;
            collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
            aggregate_first?: boolean | undefined;
        } & {
            field: string;
            ranges: Readonly<{
                label?: string | undefined;
                lte?: number | undefined;
                gt?: number | undefined;
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
                    type: "color_code";
                    value: string;
                }> | undefined;
            } & {
                mapping: Readonly<{} & {
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[];
                palette: string;
                mode: "categorical";
            }> | Readonly<{
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                sort?: "desc" | "asc" | undefined;
                unassigned?: Readonly<{
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
            collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
            aggregate_first?: boolean | undefined;
        } & {
            filters: Readonly<{
                label?: string | undefined;
            } & {
                filter: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
                }>;
            }>[];
            operation: "filters";
        }> | undefined;
    } & {
        type: "area" | "line" | "bar_stacked" | "bar" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage";
        y: (Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            label?: string | undefined;
            field?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
                decimals: number;
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                type: "bytes" | "bits";
                decimals: number;
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                type: "duration";
                from: string;
                to: string;
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            field: string;
            operation: "min" | "max" | "average" | "median" | "standard_deviation";
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            field: string;
            operation: "last_value";
            time_field: string;
            multi_value: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            field: string;
            percentile: number;
            operation: "percentile";
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            field: string;
            rank: number;
            operation: "percentile_rank";
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            operation: "differences";
            of: Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
                }> | undefined;
                label?: string | undefined;
                field?: string | undefined;
                format?: Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "number" | "percent";
                    compact: boolean;
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "bytes" | "bits";
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "duration";
                    from: string;
                    to: string;
                }> | Readonly<{} & {
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                operation: "count";
                empty_as_null: boolean;
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                operation: "unique_count";
                empty_as_null: boolean;
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                operation: "min" | "max" | "average" | "median" | "standard_deviation";
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                operation: "sum";
                empty_as_null: boolean;
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
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
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                percentile: number;
                operation: "percentile";
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                rank: number;
                operation: "percentile_rank";
            }>;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            window: number;
            operation: "moving_average";
            of: Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
                }> | undefined;
                label?: string | undefined;
                field?: string | undefined;
                format?: Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "number" | "percent";
                    compact: boolean;
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "bytes" | "bits";
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "duration";
                    from: string;
                    to: string;
                }> | Readonly<{} & {
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                operation: "count";
                empty_as_null: boolean;
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                operation: "unique_count";
                empty_as_null: boolean;
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                operation: "min" | "max" | "average" | "median" | "standard_deviation";
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                operation: "sum";
                empty_as_null: boolean;
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
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
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                percentile: number;
                operation: "percentile";
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                rank: number;
                operation: "percentile_rank";
            }>;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            field: string;
            operation: "cumulative_sum";
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            field: string;
            operation: "counter_rate";
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            formula: string;
            operation: "formula";
        }>)[];
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
                script?: string | undefined;
                format?: Readonly<{
                    params?: any;
                } & {
                    type: string;
                }> | undefined;
                custom_label?: string | undefined;
                custom_description?: string | undefined;
            } & {
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
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
                    type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
                }>>;
            }>> | undefined>;
        }>;
        sampling: number;
        ignore_global_filters: boolean;
    }> | Readonly<{} & {
        type: "reference_lines";
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
                script?: string | undefined;
                format?: Readonly<{
                    params?: any;
                } & {
                    type: string;
                }> | undefined;
                custom_label?: string | undefined;
                custom_description?: string | undefined;
            } & {
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
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
                    type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
                }>>;
            }>> | undefined>;
        }>;
        sampling: number;
        ignore_global_filters: boolean;
        thresholds: (Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
            label?: string | undefined;
            field?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
                decimals: number;
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                type: "bytes" | "bits";
                decimals: number;
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                type: "duration";
                from: string;
                to: string;
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            position?: "auto" | "left" | "right" | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
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
                type: "custom";
                pattern: string;
            }> | undefined;
            position?: "auto" | "left" | "right" | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
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
                type: "custom";
                pattern: string;
            }> | undefined;
            position?: "auto" | "left" | "right" | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            operation: "min" | "max" | "average" | "median" | "standard_deviation";
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
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
                type: "custom";
                pattern: string;
            }> | undefined;
            position?: "auto" | "left" | "right" | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
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
                type: "custom";
                pattern: string;
            }> | undefined;
            position?: "auto" | "left" | "right" | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            operation: "last_value";
            time_field: string;
            multi_value: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
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
                type: "custom";
                pattern: string;
            }> | undefined;
            position?: "auto" | "left" | "right" | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            percentile: number;
            operation: "percentile";
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
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
                type: "custom";
                pattern: string;
            }> | undefined;
            position?: "auto" | "left" | "right" | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            rank: number;
            operation: "percentile_rank";
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
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
                type: "custom";
                pattern: string;
            }> | undefined;
            position?: "auto" | "left" | "right" | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            value: number;
            operation: "static_value";
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
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
                type: "custom";
                pattern: string;
            }> | undefined;
            position?: "auto" | "left" | "right" | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            formula: string;
            operation: "formula";
        }>)[];
    }> | Readonly<{} & {
        type: "annotations";
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
                script?: string | undefined;
                format?: Readonly<{
                    params?: any;
                } & {
                    type: string;
                }> | undefined;
                custom_label?: string | undefined;
                custom_description?: string | undefined;
            } & {
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
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
                    type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
                }>>;
            }>> | undefined>;
        }>;
        events: (Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{
                field?: string | undefined;
            } & {
                visible: boolean;
            }> | undefined;
            label?: string | undefined;
            line?: Readonly<{} & {
                stroke_width: number;
                stroke_dash: "dashed" | "dotted" | "solid";
            }> | undefined;
            visible?: boolean | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            extra_fields?: string[] | undefined;
        } & {
            type: "query";
            query: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }>;
            time_field: string;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            label?: string | undefined;
            line?: Readonly<{} & {
                stroke_width: number;
                stroke_dash: "dashed" | "dotted" | "solid";
            }> | undefined;
            visible?: boolean | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        } & {
            type: "point";
            timestamp: string | number;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            fill?: "inside" | "outside" | undefined;
            label?: string | undefined;
            visible?: boolean | undefined;
        } & {
            type: "range";
            interval: Readonly<{} & {
                from: string | number;
                to: string | number;
            }>;
        }>)[];
        ignore_global_filters: boolean;
    }> | Readonly<{} & {
        type: "annotation_group";
        group_id: string;
    }>)[]>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "kql" | "lucene";
    }> | undefined>;
    legend: import("@kbn/config-schema").Type<Readonly<{
        position?: "top" | "bottom" | undefined;
        statistics?: ("range" | "min" | "max" | "count" | "total" | "avg" | "median" | "difference" | "distinct_count" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "auto" | "visible" | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | Readonly<{} & {
            type: "list";
        }> | undefined;
        placement?: "outside" | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        position?: "left" | "right" | undefined;
        size?: "s" | "auto" | "m" | "l" | "xl" | undefined;
        statistics?: ("range" | "min" | "max" | "count" | "total" | "avg" | "median" | "difference" | "distinct_count" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "auto" | "visible" | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        placement?: "outside" | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        position?: "top_left" | "bottom_right" | "top_right" | "bottom_left" | undefined;
        statistics?: ("range" | "min" | "max" | "count" | "total" | "avg" | "median" | "difference" | "distinct_count" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        columns?: number | undefined;
        visibility?: "hidden" | "auto" | "visible" | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {
        placement: "inside";
    }> | undefined>;
    axis: import("@kbn/config-schema").Type<Readonly<{
        y?: Readonly<{
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            domain?: import("@kbn/config-schema/src/types").ObjectResultUnionType<{
                type: import("@kbn/config-schema").Type<"full">;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            } | {
                type: import("@kbn/config-schema").Type<"fit">;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            } | {
                type: import("@kbn/config-schema").Type<"custom">;
                min: import("@kbn/config-schema").Type<number>;
                max: import("@kbn/config-schema").Type<number>;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            }> | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        x?: Readonly<{
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "linear" | "ordinal" | "temporal" | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            domain?: Readonly<{
                rounding?: boolean | undefined;
            } & {
                type: "fit";
            }> | Readonly<{
                rounding?: boolean | undefined;
            } & {
                type: "custom";
                min: number;
                max: number;
            }> | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        y2?: Readonly<{
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            domain?: import("@kbn/config-schema/src/types").ObjectResultUnionType<{
                type: import("@kbn/config-schema").Type<"full">;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            } | {
                type: import("@kbn/config-schema").Type<"fit">;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            } | {
                type: import("@kbn/config-schema").Type<"custom">;
                min: import("@kbn/config-schema").Type<number>;
                max: import("@kbn/config-schema").Type<number>;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            }> | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
    styling: import("@kbn/config-schema").Type<Readonly<{
        overlays?: Readonly<{
            partial_buckets?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            current_time_marker?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        points?: Readonly<{
            visibility?: "hidden" | "auto" | "visible" | undefined;
        } & {}> | undefined;
        fitting?: Readonly<{
            extend?: "none" | "zero" | "nearest" | undefined;
            emphasize?: boolean | undefined;
        } & {
            type: "none" | "average" | "zero" | "linear" | "nearest" | "carry" | "lookahead";
        }> | undefined;
        interpolation?: "linear" | "smooth" | "stepped" | undefined;
        areas?: Readonly<{
            fill_opacity?: number | undefined;
        } & {}> | undefined;
        bars?: Readonly<{
            minimum_height?: number | undefined;
            data_labels?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
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
    }, "type" | "field" | "params" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"dsl">;
        field: import("@kbn/config-schema").Type<string | undefined>;
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
/**
 * XY chart state for ES|QL layers only (reference lines are not supported)
 */
export declare const xyConfigSchemaESQL: import("@kbn/config-schema").ObjectType<{
    layers: import("@kbn/config-schema").Type<Readonly<{
        x?: Readonly<{
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
                type: "custom";
                pattern: string;
            }> | undefined;
        } & {
            column: string;
        }> | undefined;
        breakdown_by?: Readonly<{
            color?: Readonly<{
                unassigned?: Readonly<{
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
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[];
                palette: string;
                mode: "categorical";
            }> | Readonly<{
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                sort?: "desc" | "asc" | undefined;
                unassigned?: Readonly<{
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
                type: "custom";
                pattern: string;
            }> | undefined;
            collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
        } & {
            column: string;
        }> | undefined;
    } & {
        type: "area" | "line" | "bar_stacked" | "bar" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage";
        y: Readonly<{
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
                type: "number" | "percent";
                compact: boolean;
                decimals: number;
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                type: "bytes" | "bits";
                decimals: number;
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                type: "duration";
                from: string;
                to: string;
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            column: string;
        }>[];
        data_source: Readonly<{} & {
            type: "esql";
            query: string;
        }>;
        sampling: number;
        ignore_global_filters: boolean;
    }>[]>;
    legend: import("@kbn/config-schema").Type<Readonly<{
        position?: "top" | "bottom" | undefined;
        statistics?: ("range" | "min" | "max" | "count" | "total" | "avg" | "median" | "difference" | "distinct_count" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "auto" | "visible" | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | Readonly<{} & {
            type: "list";
        }> | undefined;
        placement?: "outside" | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        position?: "left" | "right" | undefined;
        size?: "s" | "auto" | "m" | "l" | "xl" | undefined;
        statistics?: ("range" | "min" | "max" | "count" | "total" | "avg" | "median" | "difference" | "distinct_count" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "auto" | "visible" | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        placement?: "outside" | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        position?: "top_left" | "bottom_right" | "top_right" | "bottom_left" | undefined;
        statistics?: ("range" | "min" | "max" | "count" | "total" | "avg" | "median" | "difference" | "distinct_count" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        columns?: number | undefined;
        visibility?: "hidden" | "auto" | "visible" | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {
        placement: "inside";
    }> | undefined>;
    axis: import("@kbn/config-schema").Type<Readonly<{
        y?: Readonly<{
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            domain?: import("@kbn/config-schema/src/types").ObjectResultUnionType<{
                type: import("@kbn/config-schema").Type<"full">;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            } | {
                type: import("@kbn/config-schema").Type<"fit">;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            } | {
                type: import("@kbn/config-schema").Type<"custom">;
                min: import("@kbn/config-schema").Type<number>;
                max: import("@kbn/config-schema").Type<number>;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            }> | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        x?: Readonly<{
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "linear" | "ordinal" | "temporal" | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            domain?: Readonly<{
                rounding?: boolean | undefined;
            } & {
                type: "fit";
            }> | Readonly<{
                rounding?: boolean | undefined;
            } & {
                type: "custom";
                min: number;
                max: number;
            }> | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        y2?: Readonly<{
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            domain?: import("@kbn/config-schema/src/types").ObjectResultUnionType<{
                type: import("@kbn/config-schema").Type<"full">;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            } | {
                type: import("@kbn/config-schema").Type<"fit">;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            } | {
                type: import("@kbn/config-schema").Type<"custom">;
                min: import("@kbn/config-schema").Type<number>;
                max: import("@kbn/config-schema").Type<number>;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            }> | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
    styling: import("@kbn/config-schema").Type<Readonly<{
        overlays?: Readonly<{
            partial_buckets?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            current_time_marker?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        points?: Readonly<{
            visibility?: "hidden" | "auto" | "visible" | undefined;
        } & {}> | undefined;
        fitting?: Readonly<{
            extend?: "none" | "zero" | "nearest" | undefined;
            emphasize?: boolean | undefined;
        } & {
            type: "none" | "average" | "zero" | "linear" | "nearest" | "carry" | "lookahead";
        }> | undefined;
        interpolation?: "linear" | "smooth" | "stepped" | undefined;
        areas?: Readonly<{
            fill_opacity?: number | undefined;
        } & {}> | undefined;
        bars?: Readonly<{
            minimum_height?: number | undefined;
            data_labels?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
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
    }, "type" | "field" | "params" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"dsl">;
        field: import("@kbn/config-schema").Type<string | undefined>;
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
/**
 * XY chart state
 */
export declare const xyConfigSchema: import("./utils/object_union").ObjectUnionType<[import("@kbn/config-schema").ObjectType<{
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
                type: "custom";
                pattern: string;
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
                type: "alphabetical";
                direction: "desc" | "asc";
            }> | Readonly<{} & {
                type: "rare";
                max: number;
            }> | Readonly<{} & {
                type: "significant";
            }> | Readonly<{} & {
                type: "metric";
                direction: "desc" | "asc";
                metric_index: number;
            }> | Readonly<{} & {
                type: "custom";
                field: string;
                direction: "desc" | "asc";
                operation: "min" | "max" | "sum" | "average" | "median" | "last_value" | "unique_count" | "standard_deviation";
            }> | Readonly<{
                field?: string | undefined;
            } & {
                type: "custom";
                direction: "desc" | "asc";
                operation: "count";
            }> | Readonly<{} & {
                type: "custom";
                field: string;
                direction: "desc" | "asc";
                percentile: number;
                operation: "percentile";
            }> | Readonly<{} & {
                type: "custom";
                field: string;
                direction: "desc" | "asc";
                rank: number;
                operation: "percentile_rank";
            }> | undefined;
        } & {
            fields: string[];
            limit: number;
            operation: "terms";
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
                type: "custom";
                pattern: string;
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
                type: "custom";
                pattern: string;
            }> | undefined;
        } & {
            field: string;
            ranges: Readonly<{
                label?: string | undefined;
                lte?: number | undefined;
                gt?: number | undefined;
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
                    language: "kql" | "lucene";
                }>;
            }>[];
            operation: "filters";
        }> | undefined;
        breakdown_by?: Readonly<{
            color?: Readonly<{
                unassigned?: Readonly<{
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
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[];
                palette: string;
                mode: "categorical";
            }> | Readonly<{
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                sort?: "desc" | "asc" | undefined;
                unassigned?: Readonly<{
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
            collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
            aggregate_first?: boolean | undefined;
        } & {
            field: string;
            operation: "date_histogram";
            suggested_interval: string;
            use_original_time_range: boolean;
            include_empty_rows: boolean;
        }> | Readonly<{
            color?: Readonly<{
                unassigned?: Readonly<{
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
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[];
                palette: string;
                mode: "categorical";
            }> | Readonly<{
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                sort?: "desc" | "asc" | undefined;
                unassigned?: Readonly<{
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
                type: "custom";
                pattern: string;
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
                type: "alphabetical";
                direction: "desc" | "asc";
            }> | Readonly<{} & {
                type: "rare";
                max: number;
            }> | Readonly<{} & {
                type: "significant";
            }> | Readonly<{} & {
                type: "metric";
                direction: "desc" | "asc";
                metric_index: number;
            }> | Readonly<{} & {
                type: "custom";
                field: string;
                direction: "desc" | "asc";
                operation: "min" | "max" | "sum" | "average" | "median" | "last_value" | "unique_count" | "standard_deviation";
            }> | Readonly<{
                field?: string | undefined;
            } & {
                type: "custom";
                direction: "desc" | "asc";
                operation: "count";
            }> | Readonly<{} & {
                type: "custom";
                field: string;
                direction: "desc" | "asc";
                percentile: number;
                operation: "percentile";
            }> | Readonly<{} & {
                type: "custom";
                field: string;
                direction: "desc" | "asc";
                rank: number;
                operation: "percentile_rank";
            }> | undefined;
            collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
            aggregate_first?: boolean | undefined;
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
                    type: "color_code";
                    value: string;
                }> | undefined;
            } & {
                mapping: Readonly<{} & {
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[];
                palette: string;
                mode: "categorical";
            }> | Readonly<{
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                sort?: "desc" | "asc" | undefined;
                unassigned?: Readonly<{
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
                type: "custom";
                pattern: string;
            }> | undefined;
            collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
            aggregate_first?: boolean | undefined;
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
                    type: "color_code";
                    value: string;
                }> | undefined;
            } & {
                mapping: Readonly<{} & {
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[];
                palette: string;
                mode: "categorical";
            }> | Readonly<{
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                sort?: "desc" | "asc" | undefined;
                unassigned?: Readonly<{
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
                type: "custom";
                pattern: string;
            }> | undefined;
            collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
            aggregate_first?: boolean | undefined;
        } & {
            field: string;
            ranges: Readonly<{
                label?: string | undefined;
                lte?: number | undefined;
                gt?: number | undefined;
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
                    type: "color_code";
                    value: string;
                }> | undefined;
            } & {
                mapping: Readonly<{} & {
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[];
                palette: string;
                mode: "categorical";
            }> | Readonly<{
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                sort?: "desc" | "asc" | undefined;
                unassigned?: Readonly<{
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
            collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
            aggregate_first?: boolean | undefined;
        } & {
            filters: Readonly<{
                label?: string | undefined;
            } & {
                filter: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
                }>;
            }>[];
            operation: "filters";
        }> | undefined;
    } & {
        type: "area" | "line" | "bar_stacked" | "bar" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage";
        y: (Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            label?: string | undefined;
            field?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
                decimals: number;
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                type: "bytes" | "bits";
                decimals: number;
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                type: "duration";
                from: string;
                to: string;
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            field: string;
            operation: "min" | "max" | "average" | "median" | "standard_deviation";
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            field: string;
            operation: "last_value";
            time_field: string;
            multi_value: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            field: string;
            percentile: number;
            operation: "percentile";
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            field: string;
            rank: number;
            operation: "percentile_rank";
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            operation: "differences";
            of: Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
                }> | undefined;
                label?: string | undefined;
                field?: string | undefined;
                format?: Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "number" | "percent";
                    compact: boolean;
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "bytes" | "bits";
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "duration";
                    from: string;
                    to: string;
                }> | Readonly<{} & {
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                operation: "count";
                empty_as_null: boolean;
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                operation: "unique_count";
                empty_as_null: boolean;
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                operation: "min" | "max" | "average" | "median" | "standard_deviation";
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                operation: "sum";
                empty_as_null: boolean;
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
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
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                percentile: number;
                operation: "percentile";
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                rank: number;
                operation: "percentile_rank";
            }>;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            window: number;
            operation: "moving_average";
            of: Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
                }> | undefined;
                label?: string | undefined;
                field?: string | undefined;
                format?: Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "number" | "percent";
                    compact: boolean;
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "bytes" | "bits";
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "duration";
                    from: string;
                    to: string;
                }> | Readonly<{} & {
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                operation: "count";
                empty_as_null: boolean;
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                operation: "unique_count";
                empty_as_null: boolean;
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                operation: "min" | "max" | "average" | "median" | "standard_deviation";
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                operation: "sum";
                empty_as_null: boolean;
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
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
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                percentile: number;
                operation: "percentile";
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                rank: number;
                operation: "percentile_rank";
            }>;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            field: string;
            operation: "cumulative_sum";
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            field: string;
            operation: "counter_rate";
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            formula: string;
            operation: "formula";
        }>)[];
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
                script?: string | undefined;
                format?: Readonly<{
                    params?: any;
                } & {
                    type: string;
                }> | undefined;
                custom_label?: string | undefined;
                custom_description?: string | undefined;
            } & {
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
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
                    type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
                }>>;
            }>> | undefined>;
        }>;
        sampling: number;
        ignore_global_filters: boolean;
    }> | Readonly<{} & {
        type: "reference_lines";
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
                script?: string | undefined;
                format?: Readonly<{
                    params?: any;
                } & {
                    type: string;
                }> | undefined;
                custom_label?: string | undefined;
                custom_description?: string | undefined;
            } & {
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
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
                    type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
                }>>;
            }>> | undefined>;
        }>;
        sampling: number;
        ignore_global_filters: boolean;
        thresholds: (Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
            label?: string | undefined;
            field?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
                decimals: number;
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                type: "bytes" | "bits";
                decimals: number;
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                type: "duration";
                from: string;
                to: string;
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            position?: "auto" | "left" | "right" | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
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
                type: "custom";
                pattern: string;
            }> | undefined;
            position?: "auto" | "left" | "right" | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
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
                type: "custom";
                pattern: string;
            }> | undefined;
            position?: "auto" | "left" | "right" | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            operation: "min" | "max" | "average" | "median" | "standard_deviation";
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
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
                type: "custom";
                pattern: string;
            }> | undefined;
            position?: "auto" | "left" | "right" | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
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
                type: "custom";
                pattern: string;
            }> | undefined;
            position?: "auto" | "left" | "right" | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            operation: "last_value";
            time_field: string;
            multi_value: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
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
                type: "custom";
                pattern: string;
            }> | undefined;
            position?: "auto" | "left" | "right" | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            percentile: number;
            operation: "percentile";
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
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
                type: "custom";
                pattern: string;
            }> | undefined;
            position?: "auto" | "left" | "right" | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            rank: number;
            operation: "percentile_rank";
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
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
                type: "custom";
                pattern: string;
            }> | undefined;
            position?: "auto" | "left" | "right" | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            value: number;
            operation: "static_value";
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
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
                type: "custom";
                pattern: string;
            }> | undefined;
            position?: "auto" | "left" | "right" | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            formula: string;
            operation: "formula";
        }>)[];
    }> | Readonly<{} & {
        type: "annotations";
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
                script?: string | undefined;
                format?: Readonly<{
                    params?: any;
                } & {
                    type: string;
                }> | undefined;
                custom_label?: string | undefined;
                custom_description?: string | undefined;
            } & {
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
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
                    type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
                }>>;
            }>> | undefined>;
        }>;
        events: (Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{
                field?: string | undefined;
            } & {
                visible: boolean;
            }> | undefined;
            label?: string | undefined;
            line?: Readonly<{} & {
                stroke_width: number;
                stroke_dash: "dashed" | "dotted" | "solid";
            }> | undefined;
            visible?: boolean | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            extra_fields?: string[] | undefined;
        } & {
            type: "query";
            query: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }>;
            time_field: string;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            label?: string | undefined;
            line?: Readonly<{} & {
                stroke_width: number;
                stroke_dash: "dashed" | "dotted" | "solid";
            }> | undefined;
            visible?: boolean | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        } & {
            type: "point";
            timestamp: string | number;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            fill?: "inside" | "outside" | undefined;
            label?: string | undefined;
            visible?: boolean | undefined;
        } & {
            type: "range";
            interval: Readonly<{} & {
                from: string | number;
                to: string | number;
            }>;
        }>)[];
        ignore_global_filters: boolean;
    }> | Readonly<{} & {
        type: "annotation_group";
        group_id: string;
    }>)[]>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "kql" | "lucene";
    }> | undefined>;
    legend: import("@kbn/config-schema").Type<Readonly<{
        position?: "top" | "bottom" | undefined;
        statistics?: ("range" | "min" | "max" | "count" | "total" | "avg" | "median" | "difference" | "distinct_count" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "auto" | "visible" | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | Readonly<{} & {
            type: "list";
        }> | undefined;
        placement?: "outside" | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        position?: "left" | "right" | undefined;
        size?: "s" | "auto" | "m" | "l" | "xl" | undefined;
        statistics?: ("range" | "min" | "max" | "count" | "total" | "avg" | "median" | "difference" | "distinct_count" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "auto" | "visible" | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        placement?: "outside" | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        position?: "top_left" | "bottom_right" | "top_right" | "bottom_left" | undefined;
        statistics?: ("range" | "min" | "max" | "count" | "total" | "avg" | "median" | "difference" | "distinct_count" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        columns?: number | undefined;
        visibility?: "hidden" | "auto" | "visible" | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {
        placement: "inside";
    }> | undefined>;
    axis: import("@kbn/config-schema").Type<Readonly<{
        y?: Readonly<{
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            domain?: import("@kbn/config-schema/src/types").ObjectResultUnionType<{
                type: import("@kbn/config-schema").Type<"full">;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            } | {
                type: import("@kbn/config-schema").Type<"fit">;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            } | {
                type: import("@kbn/config-schema").Type<"custom">;
                min: import("@kbn/config-schema").Type<number>;
                max: import("@kbn/config-schema").Type<number>;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            }> | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        x?: Readonly<{
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "linear" | "ordinal" | "temporal" | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            domain?: Readonly<{
                rounding?: boolean | undefined;
            } & {
                type: "fit";
            }> | Readonly<{
                rounding?: boolean | undefined;
            } & {
                type: "custom";
                min: number;
                max: number;
            }> | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        y2?: Readonly<{
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            domain?: import("@kbn/config-schema/src/types").ObjectResultUnionType<{
                type: import("@kbn/config-schema").Type<"full">;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            } | {
                type: import("@kbn/config-schema").Type<"fit">;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            } | {
                type: import("@kbn/config-schema").Type<"custom">;
                min: import("@kbn/config-schema").Type<number>;
                max: import("@kbn/config-schema").Type<number>;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            }> | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
    styling: import("@kbn/config-schema").Type<Readonly<{
        overlays?: Readonly<{
            partial_buckets?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            current_time_marker?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        points?: Readonly<{
            visibility?: "hidden" | "auto" | "visible" | undefined;
        } & {}> | undefined;
        fitting?: Readonly<{
            extend?: "none" | "zero" | "nearest" | undefined;
            emphasize?: boolean | undefined;
        } & {
            type: "none" | "average" | "zero" | "linear" | "nearest" | "carry" | "lookahead";
        }> | undefined;
        interpolation?: "linear" | "smooth" | "stepped" | undefined;
        areas?: Readonly<{
            fill_opacity?: number | undefined;
        } & {}> | undefined;
        bars?: Readonly<{
            minimum_height?: number | undefined;
            data_labels?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
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
    }, "type" | "field" | "params" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"dsl">;
        field: import("@kbn/config-schema").Type<string | undefined>;
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
}>, import("@kbn/config-schema").ObjectType<{
    layers: import("@kbn/config-schema").Type<Readonly<{
        x?: Readonly<{
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
                type: "custom";
                pattern: string;
            }> | undefined;
        } & {
            column: string;
        }> | undefined;
        breakdown_by?: Readonly<{
            color?: Readonly<{
                unassigned?: Readonly<{
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
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[];
                palette: string;
                mode: "categorical";
            }> | Readonly<{
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                sort?: "desc" | "asc" | undefined;
                unassigned?: Readonly<{
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
                type: "custom";
                pattern: string;
            }> | undefined;
            collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
        } & {
            column: string;
        }> | undefined;
    } & {
        type: "area" | "line" | "bar_stacked" | "bar" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage";
        y: Readonly<{
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
                type: "number" | "percent";
                compact: boolean;
                decimals: number;
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                type: "bytes" | "bits";
                decimals: number;
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                type: "duration";
                from: string;
                to: string;
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            column: string;
        }>[];
        data_source: Readonly<{} & {
            type: "esql";
            query: string;
        }>;
        sampling: number;
        ignore_global_filters: boolean;
    }>[]>;
    legend: import("@kbn/config-schema").Type<Readonly<{
        position?: "top" | "bottom" | undefined;
        statistics?: ("range" | "min" | "max" | "count" | "total" | "avg" | "median" | "difference" | "distinct_count" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "auto" | "visible" | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | Readonly<{} & {
            type: "list";
        }> | undefined;
        placement?: "outside" | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        position?: "left" | "right" | undefined;
        size?: "s" | "auto" | "m" | "l" | "xl" | undefined;
        statistics?: ("range" | "min" | "max" | "count" | "total" | "avg" | "median" | "difference" | "distinct_count" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "auto" | "visible" | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        placement?: "outside" | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        position?: "top_left" | "bottom_right" | "top_right" | "bottom_left" | undefined;
        statistics?: ("range" | "min" | "max" | "count" | "total" | "avg" | "median" | "difference" | "distinct_count" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        columns?: number | undefined;
        visibility?: "hidden" | "auto" | "visible" | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {
        placement: "inside";
    }> | undefined>;
    axis: import("@kbn/config-schema").Type<Readonly<{
        y?: Readonly<{
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            domain?: import("@kbn/config-schema/src/types").ObjectResultUnionType<{
                type: import("@kbn/config-schema").Type<"full">;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            } | {
                type: import("@kbn/config-schema").Type<"fit">;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            } | {
                type: import("@kbn/config-schema").Type<"custom">;
                min: import("@kbn/config-schema").Type<number>;
                max: import("@kbn/config-schema").Type<number>;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            }> | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        x?: Readonly<{
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "linear" | "ordinal" | "temporal" | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            domain?: Readonly<{
                rounding?: boolean | undefined;
            } & {
                type: "fit";
            }> | Readonly<{
                rounding?: boolean | undefined;
            } & {
                type: "custom";
                min: number;
                max: number;
            }> | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        y2?: Readonly<{
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            domain?: import("@kbn/config-schema/src/types").ObjectResultUnionType<{
                type: import("@kbn/config-schema").Type<"full">;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            } | {
                type: import("@kbn/config-schema").Type<"fit">;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            } | {
                type: import("@kbn/config-schema").Type<"custom">;
                min: import("@kbn/config-schema").Type<number>;
                max: import("@kbn/config-schema").Type<number>;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            }> | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
    styling: import("@kbn/config-schema").Type<Readonly<{
        overlays?: Readonly<{
            partial_buckets?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            current_time_marker?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        points?: Readonly<{
            visibility?: "hidden" | "auto" | "visible" | undefined;
        } & {}> | undefined;
        fitting?: Readonly<{
            extend?: "none" | "zero" | "nearest" | undefined;
            emphasize?: boolean | undefined;
        } & {
            type: "none" | "average" | "zero" | "linear" | "nearest" | "carry" | "lookahead";
        }> | undefined;
        interpolation?: "linear" | "smooth" | "stepped" | undefined;
        areas?: Readonly<{
            fill_opacity?: number | undefined;
        } & {}> | undefined;
        bars?: Readonly<{
            minimum_height?: number | undefined;
            data_labels?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
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
    }, "type" | "field" | "params" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"dsl">;
        field: import("@kbn/config-schema").Type<string | undefined>;
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
}>], Readonly<{
    query?: Readonly<{} & {
        expression: string;
        language: "kql" | "lucene";
    }> | undefined;
    title?: string | undefined;
    legend?: Readonly<{
        position?: "top" | "bottom" | undefined;
        statistics?: ("range" | "min" | "max" | "count" | "total" | "avg" | "median" | "difference" | "distinct_count" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "auto" | "visible" | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | Readonly<{} & {
            type: "list";
        }> | undefined;
        placement?: "outside" | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        position?: "left" | "right" | undefined;
        size?: "s" | "auto" | "m" | "l" | "xl" | undefined;
        statistics?: ("range" | "min" | "max" | "count" | "total" | "avg" | "median" | "difference" | "distinct_count" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "auto" | "visible" | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        placement?: "outside" | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        position?: "top_left" | "bottom_right" | "top_right" | "bottom_left" | undefined;
        statistics?: ("range" | "min" | "max" | "count" | "total" | "avg" | "median" | "difference" | "distinct_count" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        columns?: number | undefined;
        visibility?: "hidden" | "auto" | "visible" | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {
        placement: "inside";
    }> | undefined;
    description?: string | undefined;
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
    }, "type" | "field" | "params" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"dsl">;
        field: import("@kbn/config-schema").Type<string | undefined>;
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
    styling?: Readonly<{
        overlays?: Readonly<{
            partial_buckets?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            current_time_marker?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        points?: Readonly<{
            visibility?: "hidden" | "auto" | "visible" | undefined;
        } & {}> | undefined;
        fitting?: Readonly<{
            extend?: "none" | "zero" | "nearest" | undefined;
            emphasize?: boolean | undefined;
        } & {
            type: "none" | "average" | "zero" | "linear" | "nearest" | "carry" | "lookahead";
        }> | undefined;
        interpolation?: "linear" | "smooth" | "stepped" | undefined;
        areas?: Readonly<{
            fill_opacity?: number | undefined;
        } & {}> | undefined;
        bars?: Readonly<{
            minimum_height?: number | undefined;
            data_labels?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
    } & {}> | undefined;
    axis?: Readonly<{
        y?: Readonly<{
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            domain?: import("@kbn/config-schema/src/types").ObjectResultUnionType<{
                type: import("@kbn/config-schema").Type<"full">;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            } | {
                type: import("@kbn/config-schema").Type<"fit">;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            } | {
                type: import("@kbn/config-schema").Type<"custom">;
                min: import("@kbn/config-schema").Type<number>;
                max: import("@kbn/config-schema").Type<number>;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            }> | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        x?: Readonly<{
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "linear" | "ordinal" | "temporal" | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            domain?: Readonly<{
                rounding?: boolean | undefined;
            } & {
                type: "fit";
            }> | Readonly<{
                rounding?: boolean | undefined;
            } & {
                type: "custom";
                min: number;
                max: number;
            }> | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        y2?: Readonly<{
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            domain?: import("@kbn/config-schema/src/types").ObjectResultUnionType<{
                type: import("@kbn/config-schema").Type<"full">;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            } | {
                type: import("@kbn/config-schema").Type<"fit">;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            } | {
                type: import("@kbn/config-schema").Type<"custom">;
                min: import("@kbn/config-schema").Type<number>;
                max: import("@kbn/config-schema").Type<number>;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            }> | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
    } & {}> | undefined;
} & {
    type: "xy";
    layers: (Readonly<{
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
                type: "custom";
                pattern: string;
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
                type: "alphabetical";
                direction: "desc" | "asc";
            }> | Readonly<{} & {
                type: "rare";
                max: number;
            }> | Readonly<{} & {
                type: "significant";
            }> | Readonly<{} & {
                type: "metric";
                direction: "desc" | "asc";
                metric_index: number;
            }> | Readonly<{} & {
                type: "custom";
                field: string;
                direction: "desc" | "asc";
                operation: "min" | "max" | "sum" | "average" | "median" | "last_value" | "unique_count" | "standard_deviation";
            }> | Readonly<{
                field?: string | undefined;
            } & {
                type: "custom";
                direction: "desc" | "asc";
                operation: "count";
            }> | Readonly<{} & {
                type: "custom";
                field: string;
                direction: "desc" | "asc";
                percentile: number;
                operation: "percentile";
            }> | Readonly<{} & {
                type: "custom";
                field: string;
                direction: "desc" | "asc";
                rank: number;
                operation: "percentile_rank";
            }> | undefined;
        } & {
            fields: string[];
            limit: number;
            operation: "terms";
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
                type: "custom";
                pattern: string;
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
                type: "custom";
                pattern: string;
            }> | undefined;
        } & {
            field: string;
            ranges: Readonly<{
                label?: string | undefined;
                lte?: number | undefined;
                gt?: number | undefined;
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
                    language: "kql" | "lucene";
                }>;
            }>[];
            operation: "filters";
        }> | undefined;
        breakdown_by?: Readonly<{
            color?: Readonly<{
                unassigned?: Readonly<{
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
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[];
                palette: string;
                mode: "categorical";
            }> | Readonly<{
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                sort?: "desc" | "asc" | undefined;
                unassigned?: Readonly<{
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
            collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
            aggregate_first?: boolean | undefined;
        } & {
            field: string;
            operation: "date_histogram";
            suggested_interval: string;
            use_original_time_range: boolean;
            include_empty_rows: boolean;
        }> | Readonly<{
            color?: Readonly<{
                unassigned?: Readonly<{
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
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[];
                palette: string;
                mode: "categorical";
            }> | Readonly<{
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                sort?: "desc" | "asc" | undefined;
                unassigned?: Readonly<{
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
                type: "custom";
                pattern: string;
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
                type: "alphabetical";
                direction: "desc" | "asc";
            }> | Readonly<{} & {
                type: "rare";
                max: number;
            }> | Readonly<{} & {
                type: "significant";
            }> | Readonly<{} & {
                type: "metric";
                direction: "desc" | "asc";
                metric_index: number;
            }> | Readonly<{} & {
                type: "custom";
                field: string;
                direction: "desc" | "asc";
                operation: "min" | "max" | "sum" | "average" | "median" | "last_value" | "unique_count" | "standard_deviation";
            }> | Readonly<{
                field?: string | undefined;
            } & {
                type: "custom";
                direction: "desc" | "asc";
                operation: "count";
            }> | Readonly<{} & {
                type: "custom";
                field: string;
                direction: "desc" | "asc";
                percentile: number;
                operation: "percentile";
            }> | Readonly<{} & {
                type: "custom";
                field: string;
                direction: "desc" | "asc";
                rank: number;
                operation: "percentile_rank";
            }> | undefined;
            collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
            aggregate_first?: boolean | undefined;
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
                    type: "color_code";
                    value: string;
                }> | undefined;
            } & {
                mapping: Readonly<{} & {
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[];
                palette: string;
                mode: "categorical";
            }> | Readonly<{
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                sort?: "desc" | "asc" | undefined;
                unassigned?: Readonly<{
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
                type: "custom";
                pattern: string;
            }> | undefined;
            collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
            aggregate_first?: boolean | undefined;
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
                    type: "color_code";
                    value: string;
                }> | undefined;
            } & {
                mapping: Readonly<{} & {
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[];
                palette: string;
                mode: "categorical";
            }> | Readonly<{
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                sort?: "desc" | "asc" | undefined;
                unassigned?: Readonly<{
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
                type: "custom";
                pattern: string;
            }> | undefined;
            collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
            aggregate_first?: boolean | undefined;
        } & {
            field: string;
            ranges: Readonly<{
                label?: string | undefined;
                lte?: number | undefined;
                gt?: number | undefined;
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
                    type: "color_code";
                    value: string;
                }> | undefined;
            } & {
                mapping: Readonly<{} & {
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[];
                palette: string;
                mode: "categorical";
            }> | Readonly<{
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                sort?: "desc" | "asc" | undefined;
                unassigned?: Readonly<{
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
            collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
            aggregate_first?: boolean | undefined;
        } & {
            filters: Readonly<{
                label?: string | undefined;
            } & {
                filter: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
                }>;
            }>[];
            operation: "filters";
        }> | undefined;
    } & {
        type: "area" | "line" | "bar_stacked" | "bar" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage";
        y: (Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            label?: string | undefined;
            field?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
                decimals: number;
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                type: "bytes" | "bits";
                decimals: number;
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                type: "duration";
                from: string;
                to: string;
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            field: string;
            operation: "min" | "max" | "average" | "median" | "standard_deviation";
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            field: string;
            operation: "last_value";
            time_field: string;
            multi_value: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            field: string;
            percentile: number;
            operation: "percentile";
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            field: string;
            rank: number;
            operation: "percentile_rank";
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            operation: "differences";
            of: Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
                }> | undefined;
                label?: string | undefined;
                field?: string | undefined;
                format?: Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "number" | "percent";
                    compact: boolean;
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "bytes" | "bits";
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "duration";
                    from: string;
                    to: string;
                }> | Readonly<{} & {
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                operation: "count";
                empty_as_null: boolean;
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                operation: "unique_count";
                empty_as_null: boolean;
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                operation: "min" | "max" | "average" | "median" | "standard_deviation";
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                operation: "sum";
                empty_as_null: boolean;
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
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
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                percentile: number;
                operation: "percentile";
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                rank: number;
                operation: "percentile_rank";
            }>;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            window: number;
            operation: "moving_average";
            of: Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
                }> | undefined;
                label?: string | undefined;
                field?: string | undefined;
                format?: Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "number" | "percent";
                    compact: boolean;
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "bytes" | "bits";
                    decimals: number;
                }> | Readonly<{
                    suffix?: string | undefined;
                } & {
                    type: "duration";
                    from: string;
                    to: string;
                }> | Readonly<{} & {
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                operation: "count";
                empty_as_null: boolean;
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                operation: "unique_count";
                empty_as_null: boolean;
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                operation: "min" | "max" | "average" | "median" | "standard_deviation";
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                operation: "sum";
                empty_as_null: boolean;
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
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
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                percentile: number;
                operation: "percentile";
            }> | Readonly<{
                filter?: Readonly<{} & {
                    expression: string;
                    language: "kql" | "lucene";
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
                    type: "custom";
                    pattern: string;
                }> | undefined;
                time_scale?: "s" | "h" | "d" | "m" | undefined;
                reduced_time_range?: string | undefined;
                time_shift?: string | undefined;
            } & {
                field: string;
                rank: number;
                operation: "percentile_rank";
            }>;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            field: string;
            operation: "cumulative_sum";
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            field: string;
            operation: "counter_rate";
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
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
                type: "custom";
                pattern: string;
            }> | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            formula: string;
            operation: "formula";
        }>)[];
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
                script?: string | undefined;
                format?: Readonly<{
                    params?: any;
                } & {
                    type: string;
                }> | undefined;
                custom_label?: string | undefined;
                custom_description?: string | undefined;
            } & {
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
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
                    type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
                }>>;
            }>> | undefined>;
        }>;
        sampling: number;
        ignore_global_filters: boolean;
    }> | Readonly<{} & {
        type: "reference_lines";
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
                script?: string | undefined;
                format?: Readonly<{
                    params?: any;
                } & {
                    type: string;
                }> | undefined;
                custom_label?: string | undefined;
                custom_description?: string | undefined;
            } & {
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
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
                    type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
                }>>;
            }>> | undefined>;
        }>;
        sampling: number;
        ignore_global_filters: boolean;
        thresholds: (Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
            label?: string | undefined;
            field?: string | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
                decimals: number;
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                type: "bytes" | "bits";
                decimals: number;
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                type: "duration";
                from: string;
                to: string;
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            position?: "auto" | "left" | "right" | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
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
                type: "custom";
                pattern: string;
            }> | undefined;
            position?: "auto" | "left" | "right" | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
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
                type: "custom";
                pattern: string;
            }> | undefined;
            position?: "auto" | "left" | "right" | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            operation: "min" | "max" | "average" | "median" | "standard_deviation";
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
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
                type: "custom";
                pattern: string;
            }> | undefined;
            position?: "auto" | "left" | "right" | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
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
                type: "custom";
                pattern: string;
            }> | undefined;
            position?: "auto" | "left" | "right" | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            operation: "last_value";
            time_field: string;
            multi_value: boolean;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
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
                type: "custom";
                pattern: string;
            }> | undefined;
            position?: "auto" | "left" | "right" | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            percentile: number;
            operation: "percentile";
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
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
                type: "custom";
                pattern: string;
            }> | undefined;
            position?: "auto" | "left" | "right" | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            rank: number;
            operation: "percentile_rank";
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
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
                type: "custom";
                pattern: string;
            }> | undefined;
            position?: "auto" | "left" | "right" | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            value: number;
            operation: "static_value";
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
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
                type: "custom";
                pattern: string;
            }> | undefined;
            position?: "auto" | "left" | "right" | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "s" | "h" | "d" | "m" | undefined;
            reduced_time_range?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            formula: string;
            operation: "formula";
        }>)[];
    }> | Readonly<{} & {
        type: "annotations";
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
                script?: string | undefined;
                format?: Readonly<{
                    params?: any;
                } & {
                    type: string;
                }> | undefined;
                custom_label?: string | undefined;
                custom_description?: string | undefined;
            } & {
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
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
                    type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "geo_point";
                }>>;
            }>> | undefined>;
        }>;
        events: (Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{
                field?: string | undefined;
            } & {
                visible: boolean;
            }> | undefined;
            label?: string | undefined;
            line?: Readonly<{} & {
                stroke_width: number;
                stroke_dash: "dashed" | "dotted" | "solid";
            }> | undefined;
            visible?: boolean | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            extra_fields?: string[] | undefined;
        } & {
            type: "query";
            query: Readonly<{} & {
                expression: string;
                language: "kql" | "lucene";
            }>;
            time_field: string;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            label?: string | undefined;
            line?: Readonly<{} & {
                stroke_width: number;
                stroke_dash: "dashed" | "dotted" | "solid";
            }> | undefined;
            visible?: boolean | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        } & {
            type: "point";
            timestamp: string | number;
        }> | Readonly<{
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            fill?: "inside" | "outside" | undefined;
            label?: string | undefined;
            visible?: boolean | undefined;
        } & {
            type: "range";
            interval: Readonly<{} & {
                from: string | number;
                to: string | number;
            }>;
        }>)[];
        ignore_global_filters: boolean;
    }> | Readonly<{} & {
        type: "annotation_group";
        group_id: string;
    }>)[];
}> | Readonly<{
    title?: string | undefined;
    legend?: Readonly<{
        position?: "top" | "bottom" | undefined;
        statistics?: ("range" | "min" | "max" | "count" | "total" | "avg" | "median" | "difference" | "distinct_count" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "auto" | "visible" | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | Readonly<{} & {
            type: "list";
        }> | undefined;
        placement?: "outside" | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        position?: "left" | "right" | undefined;
        size?: "s" | "auto" | "m" | "l" | "xl" | undefined;
        statistics?: ("range" | "min" | "max" | "count" | "total" | "avg" | "median" | "difference" | "distinct_count" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "auto" | "visible" | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        placement?: "outside" | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        position?: "top_left" | "bottom_right" | "top_right" | "bottom_left" | undefined;
        statistics?: ("range" | "min" | "max" | "count" | "total" | "avg" | "median" | "difference" | "distinct_count" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        columns?: number | undefined;
        visibility?: "hidden" | "auto" | "visible" | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {
        placement: "inside";
    }> | undefined;
    description?: string | undefined;
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
    }, "type" | "field" | "params" | "dsl"> & {
        type: import("@kbn/config-schema").Type<"dsl">;
        field: import("@kbn/config-schema").Type<string | undefined>;
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
    styling?: Readonly<{
        overlays?: Readonly<{
            partial_buckets?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            current_time_marker?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        points?: Readonly<{
            visibility?: "hidden" | "auto" | "visible" | undefined;
        } & {}> | undefined;
        fitting?: Readonly<{
            extend?: "none" | "zero" | "nearest" | undefined;
            emphasize?: boolean | undefined;
        } & {
            type: "none" | "average" | "zero" | "linear" | "nearest" | "carry" | "lookahead";
        }> | undefined;
        interpolation?: "linear" | "smooth" | "stepped" | undefined;
        areas?: Readonly<{
            fill_opacity?: number | undefined;
        } & {}> | undefined;
        bars?: Readonly<{
            minimum_height?: number | undefined;
            data_labels?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
    } & {}> | undefined;
    axis?: Readonly<{
        y?: Readonly<{
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            domain?: import("@kbn/config-schema/src/types").ObjectResultUnionType<{
                type: import("@kbn/config-schema").Type<"full">;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            } | {
                type: import("@kbn/config-schema").Type<"fit">;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            } | {
                type: import("@kbn/config-schema").Type<"custom">;
                min: import("@kbn/config-schema").Type<number>;
                max: import("@kbn/config-schema").Type<number>;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            }> | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        x?: Readonly<{
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "linear" | "ordinal" | "temporal" | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            domain?: Readonly<{
                rounding?: boolean | undefined;
            } & {
                type: "fit";
            }> | Readonly<{
                rounding?: boolean | undefined;
            } & {
                type: "custom";
                min: number;
                max: number;
            }> | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        y2?: Readonly<{
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            domain?: import("@kbn/config-schema/src/types").ObjectResultUnionType<{
                type: import("@kbn/config-schema").Type<"full">;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            } | {
                type: import("@kbn/config-schema").Type<"fit">;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            } | {
                type: import("@kbn/config-schema").Type<"custom">;
                min: import("@kbn/config-schema").Type<number>;
                max: import("@kbn/config-schema").Type<number>;
                rounding: import("@kbn/config-schema").Type<boolean | undefined>;
            }> | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
    } & {}> | undefined;
} & {
    type: "xy";
    layers: Readonly<{
        x?: Readonly<{
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
                type: "custom";
                pattern: string;
            }> | undefined;
        } & {
            column: string;
        }> | undefined;
        breakdown_by?: Readonly<{
            color?: Readonly<{
                unassigned?: Readonly<{
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
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        type: "from_palette";
                        index: number;
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[];
                palette: string;
                mode: "categorical";
            }> | Readonly<{
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                sort?: "desc" | "asc" | undefined;
                unassigned?: Readonly<{
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
                type: "custom";
                pattern: string;
            }> | undefined;
            collapse_by?: "min" | "max" | "sum" | "avg" | undefined;
        } & {
            column: string;
        }> | undefined;
    } & {
        type: "area" | "line" | "bar_stacked" | "bar" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage";
        y: Readonly<{
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
                type: "number" | "percent";
                compact: boolean;
                decimals: number;
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                type: "bytes" | "bits";
                decimals: number;
            }> | Readonly<{
                suffix?: string | undefined;
            } & {
                type: "duration";
                from: string;
                to: string;
            }> | Readonly<{} & {
                type: "custom";
                pattern: string;
            }> | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            column: string;
        }>[];
        data_source: Readonly<{} & {
            type: "esql";
            query: string;
        }>;
        sampling: number;
        ignore_global_filters: boolean;
    }>[];
}>>;
export type XYConfigNoESQL = TypeOf<typeof xyConfigSchemaNoESQL>;
export type XYConfigESQL = TypeOf<typeof xyConfigSchemaESQL>;
export type XYConfig = TypeOf<typeof xyConfigSchema>;
export type DataLayerTypeESQL = TypeOf<typeof xyDataLayerSchemaESQL>;
export type DataLayerTypeNoESQL = TypeOf<typeof xyDataLayerSchemaNoESQL>;
export type DataLayerType = DataLayerTypeNoESQL | DataLayerTypeESQL;
/**
 * @deprecated ES|QL reference lines are not yet supported
 */
export type ReferenceLineLayerTypeESQL = TypeOf<typeof referenceLineLayerSchemaESQL>;
export type ReferenceLineLayerTypeNoESQL = TypeOf<typeof referenceLineLayerSchemaNoESQL>;
export type ReferenceLineLayerType = ReferenceLineLayerTypeNoESQL | ReferenceLineLayerTypeESQL;
export type AnnotationLayerType = TypeOf<typeof annotationLayerSchema>;
export type AnnotationLayerByRefType = TypeOf<typeof annotationByRefLayerSchema>;
export type AnnotationLayerByValueType = TypeOf<typeof annotationLayerByValueSchema>;
/**
 * Reference line layers are not support but included to keep existing logic
 */
export type LayerTypeESQL = TypeOf<typeof xyLayerUnionESQL> | ReferenceLineLayerTypeESQL;
export type LayerTypeNoESQL = DataLayerTypeNoESQL | ReferenceLineLayerTypeNoESQL | AnnotationLayerType;
export type XYLayer = LayerTypeNoESQL | LayerTypeESQL;
export type XYLegendOutsideHorizontal = TypeOf<typeof xyLegendOutsideHorizontalSchema>;
export type XYLegendOutsideVertical = TypeOf<typeof xyLegendOutsideVerticalSchema>;
export type XYLegendInside = TypeOf<typeof xyLegendInsideSchema>;
export type XYLegendStatistic = TypeOf<typeof statisticsSchema>;
export type XYLegendSize = TypeOf<typeof legendSizeSchema>;
export {};
