import type { TypeOf } from '@kbn/config-schema';
import { legendSizeSchema } from './shared';
/**
 * Statistical functions that can be displayed in chart legend for data series
 */
export declare const statisticsSchema: import("@kbn/config-schema").Type<"range" | "total" | "count" | "min" | "max" | "difference" | "avg" | "median" | "last_value" | "first_value" | "variance" | "distinct_count" | "standard_deviation" | "last_non_null_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value">;
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
    visibility: import("@kbn/config-schema").Type<"auto" | "hidden" | "visible" | undefined>;
    statistics: import("@kbn/config-schema").Type<("range" | "total" | "count" | "min" | "max" | "difference" | "avg" | "median" | "last_value" | "first_value" | "variance" | "distinct_count" | "standard_deviation" | "last_non_null_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined>;
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
    position: import("@kbn/config-schema").Type<"right" | "left" | undefined>;
    size: import("@kbn/config-schema").Type<"m" | "s" | "auto" | "l" | "xl" | undefined>;
    visibility: import("@kbn/config-schema").Type<"auto" | "hidden" | "visible" | undefined>;
    statistics: import("@kbn/config-schema").Type<("range" | "total" | "count" | "min" | "max" | "difference" | "avg" | "median" | "last_value" | "first_value" | "variance" | "distinct_count" | "standard_deviation" | "last_non_null_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined>;
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
    visibility: import("@kbn/config-schema").Type<"auto" | "hidden" | "visible" | undefined>;
    statistics: import("@kbn/config-schema").Type<("range" | "total" | "count" | "min" | "max" | "difference" | "avg" | "median" | "last_value" | "first_value" | "variance" | "distinct_count" | "standard_deviation" | "last_non_null_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined>;
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
        label?: string | undefined;
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                index: number;
                type: "from_palette";
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
        }> | Readonly<{
            sort?: "asc" | "desc" | undefined;
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                index: number;
                type: "from_palette";
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                index: number;
                type: "from_palette";
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mode: "gradient";
            palette: string;
        }> | undefined;
        drop_partial_intervals?: boolean | undefined;
        collapse_by?: "min" | "max" | "avg" | "sum" | undefined;
        aggregate_first?: boolean | undefined;
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
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                index: number;
                type: "from_palette";
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
        }> | Readonly<{
            sort?: "asc" | "desc" | undefined;
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                index: number;
                type: "from_palette";
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                index: number;
                type: "from_palette";
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mode: "gradient";
            palette: string;
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
        collapse_by?: "min" | "max" | "avg" | "sum" | undefined;
        aggregate_first?: boolean | undefined;
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
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                index: number;
                type: "from_palette";
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
        }> | Readonly<{
            sort?: "asc" | "desc" | undefined;
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                index: number;
                type: "from_palette";
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                index: number;
                type: "from_palette";
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mode: "gradient";
            palette: string;
        }> | undefined;
        collapse_by?: "min" | "max" | "avg" | "sum" | undefined;
        aggregate_first?: boolean | undefined;
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
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                index: number;
                type: "from_palette";
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
        }> | Readonly<{
            sort?: "asc" | "desc" | undefined;
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                index: number;
                type: "from_palette";
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                index: number;
                type: "from_palette";
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mode: "gradient";
            palette: string;
        }> | undefined;
        collapse_by?: "min" | "max" | "avg" | "sum" | undefined;
        aggregate_first?: boolean | undefined;
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
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                index: number;
                type: "from_palette";
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
        }> | Readonly<{
            sort?: "asc" | "desc" | undefined;
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                index: number;
                type: "from_palette";
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                index: number;
                type: "from_palette";
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mode: "gradient";
            palette: string;
        }> | undefined;
        collapse_by?: "min" | "max" | "avg" | "sum" | undefined;
        aggregate_first?: boolean | undefined;
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
    y: import("@kbn/config-schema").Type<(Readonly<{
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
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "y2" | undefined;
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
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "y2" | undefined;
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
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "y2" | undefined;
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
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "y2" | undefined;
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
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "y2" | undefined;
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
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "y2" | undefined;
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
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "y2" | undefined;
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
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "y2" | undefined;
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
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "y2" | undefined;
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
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "y2" | undefined;
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
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "y2" | undefined;
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
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
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
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
    ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
    sampling: import("@kbn/config-schema").Type<number>;
}>;
/**
 * Data layer configuration for ES|QL queries with column-based metrics
 */
declare const xyDataLayerSchemaESQL: import("@kbn/config-schema").ObjectType<{
    breakdown_by: import("@kbn/config-schema").Type<Readonly<{
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                index: number;
                type: "from_palette";
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
        }> | Readonly<{
            sort?: "asc" | "desc" | undefined;
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                index: number;
                type: "from_palette";
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                index: number;
                type: "from_palette";
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mode: "gradient";
            palette: string;
        }> | undefined;
        collapse_by?: "min" | "max" | "avg" | "sum" | undefined;
    } & {
        column: string;
    }> | undefined>;
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
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        axis?: "y" | "y2" | undefined;
    } & {
        column: string;
    }>[]>;
    x: import("@kbn/config-schema").Type<Readonly<{
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        fill?: "above" | "below" | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
        position?: "right" | "left" | "auto" | undefined;
        field?: string | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "x" | "y2" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        fill?: "above" | "below" | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
        position?: "right" | "left" | "auto" | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
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
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        fill?: "above" | "below" | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
        position?: "right" | "left" | "auto" | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
        reduced_time_range?: string | undefined;
        time_shift?: string | undefined;
        axis?: "y" | "x" | "y2" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
    } & {
        field: string;
        operation: "min" | "max" | "average" | "median" | "standard_deviation";
    }> | Readonly<{
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        fill?: "above" | "below" | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
        position?: "right" | "left" | "auto" | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
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
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        fill?: "above" | "below" | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
        position?: "right" | "left" | "auto" | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
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
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        fill?: "above" | "below" | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
        position?: "right" | "left" | "auto" | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
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
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        fill?: "above" | "below" | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
        position?: "right" | "left" | "auto" | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
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
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        fill?: "above" | "below" | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
        position?: "right" | "left" | "auto" | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        axis?: "y" | "x" | "y2" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
    } & {
        value: number;
        operation: "static_value";
    }> | Readonly<{
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        filter?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        fill?: "above" | "below" | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
        position?: "right" | "left" | "auto" | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        time_scale?: "d" | "h" | "m" | "s" | undefined;
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
    ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
    sampling: import("@kbn/config-schema").Type<number>;
}>;
/**
 * Reference line layer for ES|QL queries with column-based thresholds
 */
declare const referenceLineLayerSchemaESQL: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"reference_lines">;
    thresholds: import("@kbn/config-schema").Type<Readonly<{
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        fill?: "above" | "below" | undefined;
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
        position?: "right" | "left" | "auto" | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
        text?: Readonly<{
            field?: string | undefined;
        } & {
            visible: boolean;
        }> | undefined;
        label?: string | undefined;
        visible?: boolean | undefined;
        line?: Readonly<{} & {
            stroke_width: number;
            stroke_dash: "dashed" | "dotted" | "solid";
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        extra_fields?: string[] | undefined;
    } & {
        type: "query";
        query: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }>;
        time_field: string;
    }> | Readonly<{
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        label?: string | undefined;
        visible?: boolean | undefined;
        line?: Readonly<{} & {
            stroke_width: number;
            stroke_dash: "dashed" | "dotted" | "solid";
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
    } & {
        timestamp: string | number;
        type: "point";
    }> | Readonly<{
        fill?: "inside" | "outside" | undefined;
        label?: string | undefined;
        visible?: boolean | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
        text?: Readonly<{
            field?: string | undefined;
        } & {
            visible: boolean;
        }> | undefined;
        label?: string | undefined;
        visible?: boolean | undefined;
        line?: Readonly<{} & {
            stroke_width: number;
            stroke_dash: "dashed" | "dotted" | "solid";
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        extra_fields?: string[] | undefined;
    } & {
        type: "query";
        query: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }>;
        time_field: string;
    }> | Readonly<{
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        label?: string | undefined;
        visible?: boolean | undefined;
        line?: Readonly<{} & {
            stroke_width: number;
            stroke_dash: "dashed" | "dotted" | "solid";
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
    } & {
        timestamp: string | number;
        type: "point";
    }> | Readonly<{
        fill?: "inside" | "outside" | undefined;
        label?: string | undefined;
        visible?: boolean | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
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
    ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
}>, import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"annotation_group">;
    group_id: import("@kbn/config-schema").Type<string>;
}>], Readonly<{} & {
    type: "annotations";
    events: (Readonly<{
        text?: Readonly<{
            field?: string | undefined;
        } & {
            visible: boolean;
        }> | undefined;
        label?: string | undefined;
        visible?: boolean | undefined;
        line?: Readonly<{} & {
            stroke_width: number;
            stroke_dash: "dashed" | "dotted" | "solid";
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        extra_fields?: string[] | undefined;
    } & {
        type: "query";
        query: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }>;
        time_field: string;
    }> | Readonly<{
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        label?: string | undefined;
        visible?: boolean | undefined;
        line?: Readonly<{} & {
            stroke_width: number;
            stroke_dash: "dashed" | "dotted" | "solid";
        }> | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
    } & {
        timestamp: string | number;
        type: "point";
    }> | Readonly<{
        fill?: "inside" | "outside" | undefined;
        label?: string | undefined;
        visible?: boolean | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
    } & {
        type: "range";
        interval: Readonly<{} & {
            from: string | number;
            to: string | number;
        }>;
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
    ignore_global_filters: boolean;
}> | Readonly<{} & {
    type: "annotation_group";
    group_id: string;
}>>;
declare const xyLayerUnionESQL: import("./utils/object_union").ObjectUnionType<[import("@kbn/config-schema").ObjectType<{
    breakdown_by: import("@kbn/config-schema").Type<Readonly<{
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                index: number;
                type: "from_palette";
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
        }> | Readonly<{
            sort?: "asc" | "desc" | undefined;
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                index: number;
                type: "from_palette";
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                index: number;
                type: "from_palette";
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mode: "gradient";
            palette: string;
        }> | undefined;
        collapse_by?: "min" | "max" | "avg" | "sum" | undefined;
    } & {
        column: string;
    }> | undefined>;
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
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        axis?: "y" | "y2" | undefined;
    } & {
        column: string;
    }>[]>;
    x: import("@kbn/config-schema").Type<Readonly<{
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
    type: import("@kbn/config-schema").Type<"area" | "line" | "bar_stacked" | "bar" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage">;
    data_source: import("@kbn/config-schema").ObjectType<{
        type: import("@kbn/config-schema").Type<"esql">;
        query: import("@kbn/config-schema").Type<string>;
    }>;
    ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
    sampling: import("@kbn/config-schema").Type<number>;
}>], Readonly<{
    x?: Readonly<{
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
    breakdown_by?: Readonly<{
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
        color?: Readonly<{
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                index: number;
                type: "from_palette";
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
                color: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>;
            }>[];
            palette: string;
        }> | Readonly<{
            sort?: "asc" | "desc" | undefined;
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
                    type: "multi_field_key";
                    keys: string[];
                }>)[];
            }>[] | undefined;
            gradient?: (Readonly<{
                palette?: string | undefined;
            } & {
                index: number;
                type: "from_palette";
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }>)[] | undefined;
            unassigned?: Readonly<{
                palette?: string | undefined;
            } & {
                index: number;
                type: "from_palette";
            }> | Readonly<{} & {
                type: "color_code";
                value: string;
            }> | undefined;
        } & {
            mode: "gradient";
            palette: string;
        }> | undefined;
        collapse_by?: "min" | "max" | "avg" | "sum" | undefined;
    } & {
        column: string;
    }> | undefined;
} & {
    y: Readonly<{
        format?: Readonly<{
            suffix?: string | undefined;
        } & {
            type: "number" | "percent";
            compact: boolean;
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
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        axis?: "y" | "y2" | undefined;
    } & {
        column: string;
    }>[];
    type: "area" | "line" | "bar_stacked" | "bar" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage";
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
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
        breakdown_by?: Readonly<{
            label?: string | undefined;
            color?: Readonly<{
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        index: number;
                        type: "from_palette";
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
                }>[];
                palette: string;
            }> | Readonly<{
                sort?: "asc" | "desc" | undefined;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                gradient?: (Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>)[] | undefined;
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }> | undefined;
            } & {
                mode: "gradient";
                palette: string;
            }> | undefined;
            drop_partial_intervals?: boolean | undefined;
            collapse_by?: "min" | "max" | "avg" | "sum" | undefined;
            aggregate_first?: boolean | undefined;
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
            color?: Readonly<{
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        index: number;
                        type: "from_palette";
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
                }>[];
                palette: string;
            }> | Readonly<{
                sort?: "asc" | "desc" | undefined;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                gradient?: (Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>)[] | undefined;
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }> | undefined;
            } & {
                mode: "gradient";
                palette: string;
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
            collapse_by?: "min" | "max" | "avg" | "sum" | undefined;
            aggregate_first?: boolean | undefined;
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
            color?: Readonly<{
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        index: number;
                        type: "from_palette";
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
                }>[];
                palette: string;
            }> | Readonly<{
                sort?: "asc" | "desc" | undefined;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                gradient?: (Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>)[] | undefined;
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }> | undefined;
            } & {
                mode: "gradient";
                palette: string;
            }> | undefined;
            collapse_by?: "min" | "max" | "avg" | "sum" | undefined;
            aggregate_first?: boolean | undefined;
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
            color?: Readonly<{
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        index: number;
                        type: "from_palette";
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
                }>[];
                palette: string;
            }> | Readonly<{
                sort?: "asc" | "desc" | undefined;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                gradient?: (Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>)[] | undefined;
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }> | undefined;
            } & {
                mode: "gradient";
                palette: string;
            }> | undefined;
            collapse_by?: "min" | "max" | "avg" | "sum" | undefined;
            aggregate_first?: boolean | undefined;
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
            color?: Readonly<{
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        index: number;
                        type: "from_palette";
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
                }>[];
                palette: string;
            }> | Readonly<{
                sort?: "asc" | "desc" | undefined;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                gradient?: (Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>)[] | undefined;
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }> | undefined;
            } & {
                mode: "gradient";
                palette: string;
            }> | undefined;
            collapse_by?: "min" | "max" | "avg" | "sum" | undefined;
            aggregate_first?: boolean | undefined;
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
    } & {
        y: (Readonly<{
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            formula: string;
            operation: "formula";
        }>)[];
        type: "area" | "line" | "bar_stacked" | "bar" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage";
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
        thresholds: (Readonly<{
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            position?: "right" | "left" | "auto" | undefined;
            field?: string | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            position?: "right" | "left" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
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
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            position?: "right" | "left" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            operation: "min" | "max" | "average" | "median" | "standard_deviation";
        }> | Readonly<{
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            position?: "right" | "left" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
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
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            position?: "right" | "left" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
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
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            position?: "right" | "left" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
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
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            position?: "right" | "left" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
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
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            position?: "right" | "left" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            value: number;
            operation: "static_value";
        }> | Readonly<{
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            position?: "right" | "left" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
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
        events: (Readonly<{
            text?: Readonly<{
                field?: string | undefined;
            } & {
                visible: boolean;
            }> | undefined;
            label?: string | undefined;
            visible?: boolean | undefined;
            line?: Readonly<{} & {
                stroke_width: number;
                stroke_dash: "dashed" | "dotted" | "solid";
            }> | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            extra_fields?: string[] | undefined;
        } & {
            type: "query";
            query: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }>;
            time_field: string;
        }> | Readonly<{
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            label?: string | undefined;
            visible?: boolean | undefined;
            line?: Readonly<{} & {
                stroke_width: number;
                stroke_dash: "dashed" | "dotted" | "solid";
            }> | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        } & {
            timestamp: string | number;
            type: "point";
        }> | Readonly<{
            fill?: "inside" | "outside" | undefined;
            label?: string | undefined;
            visible?: boolean | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
        } & {
            type: "range";
            interval: Readonly<{} & {
                from: string | number;
                to: string | number;
            }>;
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
        ignore_global_filters: boolean;
    }> | Readonly<{} & {
        type: "annotation_group";
        group_id: string;
    }>)[]>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    legend: import("@kbn/config-schema").Type<Readonly<{
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
        position?: "top" | "bottom" | undefined;
        visibility?: "auto" | "hidden" | "visible" | undefined;
        statistics?: ("range" | "total" | "count" | "min" | "max" | "difference" | "avg" | "median" | "last_value" | "first_value" | "variance" | "distinct_count" | "standard_deviation" | "last_non_null_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        placement?: "outside" | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        size?: "m" | "s" | "auto" | "l" | "xl" | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        position?: "right" | "left" | undefined;
        visibility?: "auto" | "hidden" | "visible" | undefined;
        statistics?: ("range" | "total" | "count" | "min" | "max" | "difference" | "avg" | "median" | "last_value" | "first_value" | "variance" | "distinct_count" | "standard_deviation" | "last_non_null_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        placement?: "outside" | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        position?: "top_left" | "bottom_right" | "top_right" | "bottom_left" | undefined;
        visibility?: "auto" | "hidden" | "visible" | undefined;
        columns?: number | undefined;
        statistics?: ("range" | "total" | "count" | "min" | "max" | "difference" | "avg" | "median" | "last_value" | "first_value" | "variance" | "distinct_count" | "standard_deviation" | "last_non_null_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {
        placement: "inside";
    }> | undefined>;
    axis: import("@kbn/config-schema").Type<Readonly<{
        y?: Readonly<{
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
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        x?: Readonly<{
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
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "linear" | "ordinal" | "temporal" | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        y2?: Readonly<{
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
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
    styling: import("@kbn/config-schema").Type<Readonly<{
        points?: Readonly<{
            visibility?: "auto" | "hidden" | "visible" | undefined;
        } & {}> | undefined;
        overlays?: Readonly<{
            partial_buckets?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            current_time_marker?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        fitting?: Readonly<{
            extend?: "none" | "nearest" | "zero" | undefined;
            emphasize?: boolean | undefined;
        } & {
            type: "none" | "linear" | "average" | "nearest" | "zero" | "carry" | "lookahead";
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
    type: import("@kbn/config-schema").Type<"xy">;
}>;
/**
 * XY chart state for ES|QL layers only (reference lines are not supported)
 */
export declare const xyConfigSchemaESQL: import("@kbn/config-schema").ObjectType<{
    layers: import("@kbn/config-schema").Type<Readonly<{
        x?: Readonly<{
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
        breakdown_by?: Readonly<{
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            color?: Readonly<{
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        index: number;
                        type: "from_palette";
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
                }>[];
                palette: string;
            }> | Readonly<{
                sort?: "asc" | "desc" | undefined;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                gradient?: (Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>)[] | undefined;
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }> | undefined;
            } & {
                mode: "gradient";
                palette: string;
            }> | undefined;
            collapse_by?: "min" | "max" | "avg" | "sum" | undefined;
        } & {
            column: string;
        }> | undefined;
    } & {
        y: Readonly<{
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            column: string;
        }>[];
        type: "area" | "line" | "bar_stacked" | "bar" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage";
        data_source: Readonly<{} & {
            type: "esql";
            query: string;
        }>;
        sampling: number;
        ignore_global_filters: boolean;
    }>[]>;
    legend: import("@kbn/config-schema").Type<Readonly<{
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
        position?: "top" | "bottom" | undefined;
        visibility?: "auto" | "hidden" | "visible" | undefined;
        statistics?: ("range" | "total" | "count" | "min" | "max" | "difference" | "avg" | "median" | "last_value" | "first_value" | "variance" | "distinct_count" | "standard_deviation" | "last_non_null_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        placement?: "outside" | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        size?: "m" | "s" | "auto" | "l" | "xl" | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        position?: "right" | "left" | undefined;
        visibility?: "auto" | "hidden" | "visible" | undefined;
        statistics?: ("range" | "total" | "count" | "min" | "max" | "difference" | "avg" | "median" | "last_value" | "first_value" | "variance" | "distinct_count" | "standard_deviation" | "last_non_null_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        placement?: "outside" | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        position?: "top_left" | "bottom_right" | "top_right" | "bottom_left" | undefined;
        visibility?: "auto" | "hidden" | "visible" | undefined;
        columns?: number | undefined;
        statistics?: ("range" | "total" | "count" | "min" | "max" | "difference" | "avg" | "median" | "last_value" | "first_value" | "variance" | "distinct_count" | "standard_deviation" | "last_non_null_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {
        placement: "inside";
    }> | undefined>;
    axis: import("@kbn/config-schema").Type<Readonly<{
        y?: Readonly<{
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
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        x?: Readonly<{
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
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "linear" | "ordinal" | "temporal" | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        y2?: Readonly<{
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
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
    styling: import("@kbn/config-schema").Type<Readonly<{
        points?: Readonly<{
            visibility?: "auto" | "hidden" | "visible" | undefined;
        } & {}> | undefined;
        overlays?: Readonly<{
            partial_buckets?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            current_time_marker?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        fitting?: Readonly<{
            extend?: "none" | "nearest" | "zero" | undefined;
            emphasize?: boolean | undefined;
        } & {
            type: "none" | "linear" | "average" | "nearest" | "zero" | "carry" | "lookahead";
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
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
        breakdown_by?: Readonly<{
            label?: string | undefined;
            color?: Readonly<{
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        index: number;
                        type: "from_palette";
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
                }>[];
                palette: string;
            }> | Readonly<{
                sort?: "asc" | "desc" | undefined;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                gradient?: (Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>)[] | undefined;
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }> | undefined;
            } & {
                mode: "gradient";
                palette: string;
            }> | undefined;
            drop_partial_intervals?: boolean | undefined;
            collapse_by?: "min" | "max" | "avg" | "sum" | undefined;
            aggregate_first?: boolean | undefined;
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
            color?: Readonly<{
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        index: number;
                        type: "from_palette";
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
                }>[];
                palette: string;
            }> | Readonly<{
                sort?: "asc" | "desc" | undefined;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                gradient?: (Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>)[] | undefined;
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }> | undefined;
            } & {
                mode: "gradient";
                palette: string;
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
            collapse_by?: "min" | "max" | "avg" | "sum" | undefined;
            aggregate_first?: boolean | undefined;
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
            color?: Readonly<{
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        index: number;
                        type: "from_palette";
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
                }>[];
                palette: string;
            }> | Readonly<{
                sort?: "asc" | "desc" | undefined;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                gradient?: (Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>)[] | undefined;
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }> | undefined;
            } & {
                mode: "gradient";
                palette: string;
            }> | undefined;
            collapse_by?: "min" | "max" | "avg" | "sum" | undefined;
            aggregate_first?: boolean | undefined;
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
            color?: Readonly<{
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        index: number;
                        type: "from_palette";
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
                }>[];
                palette: string;
            }> | Readonly<{
                sort?: "asc" | "desc" | undefined;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                gradient?: (Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>)[] | undefined;
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }> | undefined;
            } & {
                mode: "gradient";
                palette: string;
            }> | undefined;
            collapse_by?: "min" | "max" | "avg" | "sum" | undefined;
            aggregate_first?: boolean | undefined;
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
            color?: Readonly<{
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        index: number;
                        type: "from_palette";
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
                }>[];
                palette: string;
            }> | Readonly<{
                sort?: "asc" | "desc" | undefined;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                gradient?: (Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>)[] | undefined;
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }> | undefined;
            } & {
                mode: "gradient";
                palette: string;
            }> | undefined;
            collapse_by?: "min" | "max" | "avg" | "sum" | undefined;
            aggregate_first?: boolean | undefined;
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
    } & {
        y: (Readonly<{
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            formula: string;
            operation: "formula";
        }>)[];
        type: "area" | "line" | "bar_stacked" | "bar" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage";
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
        thresholds: (Readonly<{
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            position?: "right" | "left" | "auto" | undefined;
            field?: string | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            position?: "right" | "left" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
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
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            position?: "right" | "left" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            operation: "min" | "max" | "average" | "median" | "standard_deviation";
        }> | Readonly<{
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            position?: "right" | "left" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
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
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            position?: "right" | "left" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
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
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            position?: "right" | "left" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
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
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            position?: "right" | "left" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
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
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            position?: "right" | "left" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            value: number;
            operation: "static_value";
        }> | Readonly<{
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            position?: "right" | "left" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
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
        events: (Readonly<{
            text?: Readonly<{
                field?: string | undefined;
            } & {
                visible: boolean;
            }> | undefined;
            label?: string | undefined;
            visible?: boolean | undefined;
            line?: Readonly<{} & {
                stroke_width: number;
                stroke_dash: "dashed" | "dotted" | "solid";
            }> | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            extra_fields?: string[] | undefined;
        } & {
            type: "query";
            query: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }>;
            time_field: string;
        }> | Readonly<{
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            label?: string | undefined;
            visible?: boolean | undefined;
            line?: Readonly<{} & {
                stroke_width: number;
                stroke_dash: "dashed" | "dotted" | "solid";
            }> | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        } & {
            timestamp: string | number;
            type: "point";
        }> | Readonly<{
            fill?: "inside" | "outside" | undefined;
            label?: string | undefined;
            visible?: boolean | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
        } & {
            type: "range";
            interval: Readonly<{} & {
                from: string | number;
                to: string | number;
            }>;
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
        ignore_global_filters: boolean;
    }> | Readonly<{} & {
        type: "annotation_group";
        group_id: string;
    }>)[]>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    legend: import("@kbn/config-schema").Type<Readonly<{
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
        position?: "top" | "bottom" | undefined;
        visibility?: "auto" | "hidden" | "visible" | undefined;
        statistics?: ("range" | "total" | "count" | "min" | "max" | "difference" | "avg" | "median" | "last_value" | "first_value" | "variance" | "distinct_count" | "standard_deviation" | "last_non_null_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        placement?: "outside" | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        size?: "m" | "s" | "auto" | "l" | "xl" | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        position?: "right" | "left" | undefined;
        visibility?: "auto" | "hidden" | "visible" | undefined;
        statistics?: ("range" | "total" | "count" | "min" | "max" | "difference" | "avg" | "median" | "last_value" | "first_value" | "variance" | "distinct_count" | "standard_deviation" | "last_non_null_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        placement?: "outside" | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        position?: "top_left" | "bottom_right" | "top_right" | "bottom_left" | undefined;
        visibility?: "auto" | "hidden" | "visible" | undefined;
        columns?: number | undefined;
        statistics?: ("range" | "total" | "count" | "min" | "max" | "difference" | "avg" | "median" | "last_value" | "first_value" | "variance" | "distinct_count" | "standard_deviation" | "last_non_null_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {
        placement: "inside";
    }> | undefined>;
    axis: import("@kbn/config-schema").Type<Readonly<{
        y?: Readonly<{
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
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        x?: Readonly<{
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
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "linear" | "ordinal" | "temporal" | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        y2?: Readonly<{
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
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
    styling: import("@kbn/config-schema").Type<Readonly<{
        points?: Readonly<{
            visibility?: "auto" | "hidden" | "visible" | undefined;
        } & {}> | undefined;
        overlays?: Readonly<{
            partial_buckets?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            current_time_marker?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        fitting?: Readonly<{
            extend?: "none" | "nearest" | "zero" | undefined;
            emphasize?: boolean | undefined;
        } & {
            type: "none" | "linear" | "average" | "nearest" | "zero" | "carry" | "lookahead";
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
    type: import("@kbn/config-schema").Type<"xy">;
}>, import("@kbn/config-schema").ObjectType<{
    layers: import("@kbn/config-schema").Type<Readonly<{
        x?: Readonly<{
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
        breakdown_by?: Readonly<{
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            color?: Readonly<{
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        index: number;
                        type: "from_palette";
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
                }>[];
                palette: string;
            }> | Readonly<{
                sort?: "asc" | "desc" | undefined;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                gradient?: (Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>)[] | undefined;
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }> | undefined;
            } & {
                mode: "gradient";
                palette: string;
            }> | undefined;
            collapse_by?: "min" | "max" | "avg" | "sum" | undefined;
        } & {
            column: string;
        }> | undefined;
    } & {
        y: Readonly<{
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            column: string;
        }>[];
        type: "area" | "line" | "bar_stacked" | "bar" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage";
        data_source: Readonly<{} & {
            type: "esql";
            query: string;
        }>;
        sampling: number;
        ignore_global_filters: boolean;
    }>[]>;
    legend: import("@kbn/config-schema").Type<Readonly<{
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
        position?: "top" | "bottom" | undefined;
        visibility?: "auto" | "hidden" | "visible" | undefined;
        statistics?: ("range" | "total" | "count" | "min" | "max" | "difference" | "avg" | "median" | "last_value" | "first_value" | "variance" | "distinct_count" | "standard_deviation" | "last_non_null_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        placement?: "outside" | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        size?: "m" | "s" | "auto" | "l" | "xl" | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        position?: "right" | "left" | undefined;
        visibility?: "auto" | "hidden" | "visible" | undefined;
        statistics?: ("range" | "total" | "count" | "min" | "max" | "difference" | "avg" | "median" | "last_value" | "first_value" | "variance" | "distinct_count" | "standard_deviation" | "last_non_null_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        placement?: "outside" | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        position?: "top_left" | "bottom_right" | "top_right" | "bottom_left" | undefined;
        visibility?: "auto" | "hidden" | "visible" | undefined;
        columns?: number | undefined;
        statistics?: ("range" | "total" | "count" | "min" | "max" | "difference" | "avg" | "median" | "last_value" | "first_value" | "variance" | "distinct_count" | "standard_deviation" | "last_non_null_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {
        placement: "inside";
    }> | undefined>;
    axis: import("@kbn/config-schema").Type<Readonly<{
        y?: Readonly<{
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
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        x?: Readonly<{
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
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "linear" | "ordinal" | "temporal" | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        y2?: Readonly<{
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
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
    styling: import("@kbn/config-schema").Type<Readonly<{
        points?: Readonly<{
            visibility?: "auto" | "hidden" | "visible" | undefined;
        } & {}> | undefined;
        overlays?: Readonly<{
            partial_buckets?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            current_time_marker?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        fitting?: Readonly<{
            extend?: "none" | "nearest" | "zero" | undefined;
            emphasize?: boolean | undefined;
        } & {
            type: "none" | "linear" | "average" | "nearest" | "zero" | "carry" | "lookahead";
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
    type: import("@kbn/config-schema").Type<"xy">;
}>], Readonly<{
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
        position?: "top" | "bottom" | undefined;
        visibility?: "auto" | "hidden" | "visible" | undefined;
        statistics?: ("range" | "total" | "count" | "min" | "max" | "difference" | "avg" | "median" | "last_value" | "first_value" | "variance" | "distinct_count" | "standard_deviation" | "last_non_null_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        placement?: "outside" | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        size?: "m" | "s" | "auto" | "l" | "xl" | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        position?: "right" | "left" | undefined;
        visibility?: "auto" | "hidden" | "visible" | undefined;
        statistics?: ("range" | "total" | "count" | "min" | "max" | "difference" | "avg" | "median" | "last_value" | "first_value" | "variance" | "distinct_count" | "standard_deviation" | "last_non_null_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        placement?: "outside" | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        position?: "top_left" | "bottom_right" | "top_right" | "bottom_left" | undefined;
        visibility?: "auto" | "hidden" | "visible" | undefined;
        columns?: number | undefined;
        statistics?: ("range" | "total" | "count" | "min" | "max" | "difference" | "avg" | "median" | "last_value" | "first_value" | "variance" | "distinct_count" | "standard_deviation" | "last_non_null_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {
        placement: "inside";
    }> | undefined;
    styling?: Readonly<{
        points?: Readonly<{
            visibility?: "auto" | "hidden" | "visible" | undefined;
        } & {}> | undefined;
        overlays?: Readonly<{
            partial_buckets?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            current_time_marker?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        fitting?: Readonly<{
            extend?: "none" | "nearest" | "zero" | undefined;
            emphasize?: boolean | undefined;
        } & {
            type: "none" | "linear" | "average" | "nearest" | "zero" | "carry" | "lookahead";
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
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        x?: Readonly<{
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
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "linear" | "ordinal" | "temporal" | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        y2?: Readonly<{
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
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
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
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
        breakdown_by?: Readonly<{
            label?: string | undefined;
            color?: Readonly<{
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        index: number;
                        type: "from_palette";
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
                }>[];
                palette: string;
            }> | Readonly<{
                sort?: "asc" | "desc" | undefined;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                gradient?: (Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>)[] | undefined;
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }> | undefined;
            } & {
                mode: "gradient";
                palette: string;
            }> | undefined;
            drop_partial_intervals?: boolean | undefined;
            collapse_by?: "min" | "max" | "avg" | "sum" | undefined;
            aggregate_first?: boolean | undefined;
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
            color?: Readonly<{
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        index: number;
                        type: "from_palette";
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
                }>[];
                palette: string;
            }> | Readonly<{
                sort?: "asc" | "desc" | undefined;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                gradient?: (Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>)[] | undefined;
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }> | undefined;
            } & {
                mode: "gradient";
                palette: string;
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
            collapse_by?: "min" | "max" | "avg" | "sum" | undefined;
            aggregate_first?: boolean | undefined;
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
            color?: Readonly<{
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        index: number;
                        type: "from_palette";
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
                }>[];
                palette: string;
            }> | Readonly<{
                sort?: "asc" | "desc" | undefined;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                gradient?: (Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>)[] | undefined;
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }> | undefined;
            } & {
                mode: "gradient";
                palette: string;
            }> | undefined;
            collapse_by?: "min" | "max" | "avg" | "sum" | undefined;
            aggregate_first?: boolean | undefined;
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
            color?: Readonly<{
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        index: number;
                        type: "from_palette";
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
                }>[];
                palette: string;
            }> | Readonly<{
                sort?: "asc" | "desc" | undefined;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                gradient?: (Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>)[] | undefined;
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }> | undefined;
            } & {
                mode: "gradient";
                palette: string;
            }> | undefined;
            collapse_by?: "min" | "max" | "avg" | "sum" | undefined;
            aggregate_first?: boolean | undefined;
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
            color?: Readonly<{
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        index: number;
                        type: "from_palette";
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
                }>[];
                palette: string;
            }> | Readonly<{
                sort?: "asc" | "desc" | undefined;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                gradient?: (Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>)[] | undefined;
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }> | undefined;
            } & {
                mode: "gradient";
                palette: string;
            }> | undefined;
            collapse_by?: "min" | "max" | "avg" | "sum" | undefined;
            aggregate_first?: boolean | undefined;
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
    } & {
        y: (Readonly<{
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "y2" | undefined;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            formula: string;
            operation: "formula";
        }>)[];
        type: "area" | "line" | "bar_stacked" | "bar" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage";
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
        thresholds: (Readonly<{
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            position?: "right" | "left" | "auto" | undefined;
            field?: string | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            position?: "right" | "left" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
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
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            position?: "right" | "left" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
            reduced_time_range?: string | undefined;
            time_shift?: string | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            operation: "min" | "max" | "average" | "median" | "standard_deviation";
        }> | Readonly<{
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            position?: "right" | "left" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
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
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            position?: "right" | "left" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
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
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            position?: "right" | "left" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
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
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            position?: "right" | "left" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
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
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            fill?: "above" | "below" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            position?: "right" | "left" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            axis?: "y" | "x" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            value: number;
            operation: "static_value";
        }> | Readonly<{
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            filter?: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }> | undefined;
            fill?: "above" | "below" | undefined;
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            position?: "right" | "left" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            time_scale?: "d" | "h" | "m" | "s" | undefined;
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
        events: (Readonly<{
            text?: Readonly<{
                field?: string | undefined;
            } & {
                visible: boolean;
            }> | undefined;
            label?: string | undefined;
            visible?: boolean | undefined;
            line?: Readonly<{} & {
                stroke_width: number;
                stroke_dash: "dashed" | "dotted" | "solid";
            }> | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            extra_fields?: string[] | undefined;
        } & {
            type: "query";
            query: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }>;
            time_field: string;
        }> | Readonly<{
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            label?: string | undefined;
            visible?: boolean | undefined;
            line?: Readonly<{} & {
                stroke_width: number;
                stroke_dash: "dashed" | "dotted" | "solid";
            }> | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            icon?: "tag" | "alert" | "circle" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        } & {
            timestamp: string | number;
            type: "point";
        }> | Readonly<{
            fill?: "inside" | "outside" | undefined;
            label?: string | undefined;
            visible?: boolean | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
        } & {
            type: "range";
            interval: Readonly<{} & {
                from: string | number;
                to: string | number;
            }>;
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
        ignore_global_filters: boolean;
    }> | Readonly<{} & {
        type: "annotation_group";
        group_id: string;
    }>)[];
}> | Readonly<{
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
        position?: "top" | "bottom" | undefined;
        visibility?: "auto" | "hidden" | "visible" | undefined;
        statistics?: ("range" | "total" | "count" | "min" | "max" | "difference" | "avg" | "median" | "last_value" | "first_value" | "variance" | "distinct_count" | "standard_deviation" | "last_non_null_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        placement?: "outside" | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        size?: "m" | "s" | "auto" | "l" | "xl" | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        position?: "right" | "left" | undefined;
        visibility?: "auto" | "hidden" | "visible" | undefined;
        statistics?: ("range" | "total" | "count" | "min" | "max" | "difference" | "avg" | "median" | "last_value" | "first_value" | "variance" | "distinct_count" | "standard_deviation" | "last_non_null_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        placement?: "outside" | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        position?: "top_left" | "bottom_right" | "top_right" | "bottom_left" | undefined;
        visibility?: "auto" | "hidden" | "visible" | undefined;
        columns?: number | undefined;
        statistics?: ("range" | "total" | "count" | "min" | "max" | "difference" | "avg" | "median" | "last_value" | "first_value" | "variance" | "distinct_count" | "standard_deviation" | "last_non_null_value" | "first_non_null_value" | "difference_percentage" | "current_and_last_value")[] | undefined;
        series_header?: Readonly<{
            text?: string | undefined;
            visible?: boolean | undefined;
        } & {}> | undefined;
    } & {
        placement: "inside";
    }> | undefined;
    styling?: Readonly<{
        points?: Readonly<{
            visibility?: "auto" | "hidden" | "visible" | undefined;
        } & {}> | undefined;
        overlays?: Readonly<{
            partial_buckets?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            current_time_marker?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        fitting?: Readonly<{
            extend?: "none" | "nearest" | "zero" | undefined;
            emphasize?: boolean | undefined;
        } & {
            type: "none" | "linear" | "average" | "nearest" | "zero" | "carry" | "lookahead";
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
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        x?: Readonly<{
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
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "linear" | "ordinal" | "temporal" | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        y2?: Readonly<{
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
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            title?: Readonly<{
                text?: string | undefined;
                visible?: boolean | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
    } & {}> | undefined;
} & {
    type: "xy";
    layers: Readonly<{
        x?: Readonly<{
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
        breakdown_by?: Readonly<{
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
            color?: Readonly<{
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                    color: Readonly<{
                        palette?: string | undefined;
                    } & {
                        index: number;
                        type: "from_palette";
                    }> | Readonly<{} & {
                        type: "color_code";
                        value: string;
                    }>;
                }>[];
                palette: string;
            }> | Readonly<{
                sort?: "asc" | "desc" | undefined;
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
                        type: "multi_field_key";
                        keys: string[];
                    }>)[];
                }>[] | undefined;
                gradient?: (Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }>)[] | undefined;
                unassigned?: Readonly<{
                    palette?: string | undefined;
                } & {
                    index: number;
                    type: "from_palette";
                }> | Readonly<{} & {
                    type: "color_code";
                    value: string;
                }> | undefined;
            } & {
                mode: "gradient";
                palette: string;
            }> | undefined;
            collapse_by?: "min" | "max" | "avg" | "sum" | undefined;
        } & {
            column: string;
        }> | undefined;
    } & {
        y: Readonly<{
            format?: Readonly<{
                suffix?: string | undefined;
            } & {
                type: "number" | "percent";
                compact: boolean;
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
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            axis?: "y" | "y2" | undefined;
        } & {
            column: string;
        }>[];
        type: "area" | "line" | "bar_stacked" | "bar" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage";
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
