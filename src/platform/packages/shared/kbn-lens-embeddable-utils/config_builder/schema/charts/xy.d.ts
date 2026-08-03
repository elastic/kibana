import type { TypeOf } from '@kbn/config-schema';
import { legendSizeSchema } from './shared';
/**
 * Statistical functions that can be displayed in chart legend for data series
 */
export declare const statisticsSchema: import("@kbn/config-schema").Type<"range" | "avg" | "max" | "min" | "total" | "count" | "median" | "difference" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value">;
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
        visible?: boolean | undefined;
        text?: string | undefined;
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
        visible?: boolean | undefined;
        text?: string | undefined;
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
        max: number;
        min: number;
    }> | undefined>;
    title: import("@kbn/config-schema").Type<Readonly<{
        visible?: boolean | undefined;
        text?: string | undefined;
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
    type: import("@kbn/config-schema").Type<"line" | "area" | "bar" | "bar_stacked" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage">;
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
    visibility: import("@kbn/config-schema").Type<"hidden" | "visible" | "auto" | undefined>;
    statistics: import("@kbn/config-schema").Type<("range" | "avg" | "max" | "min" | "total" | "count" | "median" | "difference" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value")[] | undefined>;
    series_header: import("@kbn/config-schema").Type<Readonly<{
        visible?: boolean | undefined;
        text?: string | undefined;
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
    size: import("@kbn/config-schema").Type<"s" | "m" | "l" | "xl" | "auto" | undefined>;
    visibility: import("@kbn/config-schema").Type<"hidden" | "visible" | "auto" | undefined>;
    statistics: import("@kbn/config-schema").Type<("range" | "avg" | "max" | "min" | "total" | "count" | "median" | "difference" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value")[] | undefined>;
    series_header: import("@kbn/config-schema").Type<Readonly<{
        visible?: boolean | undefined;
        text?: string | undefined;
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
    visibility: import("@kbn/config-schema").Type<"hidden" | "visible" | "auto" | undefined>;
    statistics: import("@kbn/config-schema").Type<("range" | "avg" | "max" | "min" | "total" | "count" | "median" | "difference" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value")[] | undefined>;
    series_header: import("@kbn/config-schema").Type<Readonly<{
        visible?: boolean | undefined;
        text?: string | undefined;
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
        aggregate_first?: boolean | undefined;
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
        aggregate_first?: boolean | undefined;
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
    }> | undefined>;
    y: import("@kbn/config-schema").Type<(Readonly<{
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
        axis?: "y" | "y2" | undefined;
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
        axis?: "y" | "y2" | undefined;
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
        axis?: "y" | "y2" | undefined;
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
        axis?: "y" | "y2" | undefined;
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
        axis?: "y" | "y2" | undefined;
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
        axis?: "y" | "y2" | undefined;
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
        axis?: "y" | "y2" | undefined;
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
        axis?: "y" | "y2" | undefined;
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
        axis?: "y" | "y2" | undefined;
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
        axis?: "y" | "y2" | undefined;
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
        axis?: "y" | "y2" | undefined;
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
        axis?: "y" | "y2" | undefined;
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
    } & {
        fields: string[];
        limit: number;
        operation: "terms";
    }> | Readonly<{
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
        field: string;
        operation: "histogram";
        include_empty_rows: boolean;
        granularity: number | "auto";
    }> | Readonly<{
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
        field: string;
        ranges: Readonly<{
            gt?: number | undefined;
            lte?: number | undefined;
            label?: string | undefined;
        } & {}>[];
        operation: "range";
    }> | Readonly<{
        label?: string | undefined;
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
    }> | undefined>;
    type: import("@kbn/config-schema").Type<"line" | "area" | "bar" | "bar_stacked" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage">;
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
        axis?: "y" | "y2" | undefined;
    } & {
        column: string;
    }>[]>;
    x: import("@kbn/config-schema").Type<Readonly<{
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
    }> | undefined>;
    type: import("@kbn/config-schema").Type<"line" | "area" | "bar" | "bar_stacked" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage">;
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
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        fill?: "above" | "below" | undefined;
        field?: string | undefined;
        position?: "left" | "right" | "auto" | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
        axis?: "x" | "y" | "y2" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
    } & {
        operation: "count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        fill?: "above" | "below" | undefined;
        position?: "left" | "right" | "auto" | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
        axis?: "x" | "y" | "y2" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
    } & {
        field: string;
        operation: "unique_count";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        fill?: "above" | "below" | undefined;
        position?: "left" | "right" | "auto" | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
        axis?: "x" | "y" | "y2" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
    } & {
        field: string;
        operation: "max" | "min" | "median" | "average" | "standard_deviation";
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        fill?: "above" | "below" | undefined;
        position?: "left" | "right" | "auto" | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
        axis?: "x" | "y" | "y2" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
    } & {
        field: string;
        operation: "sum";
        empty_as_null: boolean;
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        fill?: "above" | "below" | undefined;
        position?: "left" | "right" | "auto" | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
        axis?: "x" | "y" | "y2" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
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
        fill?: "above" | "below" | undefined;
        position?: "left" | "right" | "auto" | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
        axis?: "x" | "y" | "y2" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
    } & {
        field: string;
        percentile: number;
        operation: "percentile";
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        fill?: "above" | "below" | undefined;
        position?: "left" | "right" | "auto" | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
        axis?: "x" | "y" | "y2" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
    } & {
        field: string;
        rank: number;
        operation: "percentile_rank";
    }> | Readonly<{
        fill?: "above" | "below" | undefined;
        position?: "left" | "right" | "auto" | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
        axis?: "x" | "y" | "y2" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
    } & {
        value: number;
        operation: "static_value";
    }> | Readonly<{
        filter?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        fill?: "above" | "below" | undefined;
        position?: "left" | "right" | "auto" | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
        axis?: "x" | "y" | "y2" | undefined;
        stroke_width?: number | undefined;
        stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
    } & {
        operation: "formula";
        formula: string;
    }>)[]>;
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
}>;
/**
 * Reference line layer for ES|QL queries with column-based thresholds
 */
declare const referenceLineLayerSchemaESQL: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"reference_lines">;
    thresholds: import("@kbn/config-schema").Type<Readonly<{
        fill?: "above" | "below" | undefined;
        position?: "left" | "right" | "auto" | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
        axis?: "x" | "y" | "y2" | undefined;
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
    }> | undefined>;
    type: import("@kbn/config-schema").Type<"annotations">;
    events: import("@kbn/config-schema").Type<(Readonly<{
        line?: Readonly<{} & {
            stroke_width: number;
            stroke_dash: "dashed" | "dotted" | "solid";
        }> | undefined;
        visible?: boolean | undefined;
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
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        label?: string | undefined;
        extra_fields?: string[] | undefined;
    } & {
        type: "query";
        query: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }>;
        time_field: string;
    }> | Readonly<{
        line?: Readonly<{} & {
            stroke_width: number;
            stroke_dash: "dashed" | "dotted" | "solid";
        }> | undefined;
        visible?: boolean | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        label?: string | undefined;
    } & {
        type: "point";
        timestamp: string | number;
    }> | Readonly<{
        fill?: "inside" | "outside" | undefined;
        visible?: boolean | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
    } & {
        type: "range";
        interval: Readonly<{} & {
            from: string | number;
            to: string | number;
        }>;
    }>)[]>;
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
    }> | undefined>;
    type: import("@kbn/config-schema").Type<"annotations">;
    events: import("@kbn/config-schema").Type<(Readonly<{
        line?: Readonly<{} & {
            stroke_width: number;
            stroke_dash: "dashed" | "dotted" | "solid";
        }> | undefined;
        visible?: boolean | undefined;
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
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        label?: string | undefined;
        extra_fields?: string[] | undefined;
    } & {
        type: "query";
        query: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }>;
        time_field: string;
    }> | Readonly<{
        line?: Readonly<{} & {
            stroke_width: number;
            stroke_dash: "dashed" | "dotted" | "solid";
        }> | undefined;
        visible?: boolean | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        label?: string | undefined;
    } & {
        type: "point";
        timestamp: string | number;
    }> | Readonly<{
        fill?: "inside" | "outside" | undefined;
        visible?: boolean | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
    } & {
        type: "range";
        interval: Readonly<{} & {
            from: string | number;
            to: string | number;
        }>;
    }>)[]>;
    ignore_global_filters: import("@kbn/config-schema").Type<boolean>;
}>, import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"annotation_group">;
    group_id: import("@kbn/config-schema").Type<string>;
}>], Readonly<{
    data_source?: import("@kbn/config-schema/src/types").ObjectResultUnionType<{
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
    }> | undefined;
} & {
    type: "annotations";
    events: (Readonly<{
        line?: Readonly<{} & {
            stroke_width: number;
            stroke_dash: "dashed" | "dotted" | "solid";
        }> | undefined;
        visible?: boolean | undefined;
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
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        label?: string | undefined;
        extra_fields?: string[] | undefined;
    } & {
        type: "query";
        query: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }>;
        time_field: string;
    }> | Readonly<{
        line?: Readonly<{} & {
            stroke_width: number;
            stroke_dash: "dashed" | "dotted" | "solid";
        }> | undefined;
        visible?: boolean | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        text?: Readonly<{} & {
            visible: boolean;
        }> | undefined;
        icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
        label?: string | undefined;
    } & {
        type: "point";
        timestamp: string | number;
    }> | Readonly<{
        fill?: "inside" | "outside" | undefined;
        visible?: boolean | undefined;
        color?: Readonly<{} & {
            type: "static";
            color: string;
        }> | Readonly<{} & {
            type: "auto";
        }> | undefined;
        label?: string | undefined;
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
        axis?: "y" | "y2" | undefined;
    } & {
        column: string;
    }>[]>;
    x: import("@kbn/config-schema").Type<Readonly<{
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
    }> | undefined>;
    type: import("@kbn/config-schema").Type<"line" | "area" | "bar" | "bar_stacked" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage">;
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
    }> | undefined;
    breakdown_by?: Readonly<{
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
    }> | undefined;
} & {
    type: "line" | "area" | "bar" | "bar_stacked" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage";
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
        } & {
            fields: string[];
            limit: number;
            operation: "terms";
        }> | Readonly<{
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
            field: string;
            operation: "histogram";
            include_empty_rows: boolean;
            granularity: number | "auto";
        }> | Readonly<{
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
            field: string;
            ranges: Readonly<{
                gt?: number | undefined;
                lte?: number | undefined;
                label?: string | undefined;
            } & {}>[];
            operation: "range";
        }> | Readonly<{
            label?: string | undefined;
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
        }> | undefined;
        breakdown_by?: Readonly<{
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
            aggregate_first?: boolean | undefined;
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
            aggregate_first?: boolean | undefined;
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
        }> | undefined;
    } & {
        type: "line" | "area" | "bar" | "bar_stacked" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage";
        y: (Readonly<{
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
        } & {
            operation: "formula";
            formula: string;
        }>)[];
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
        sampling: number;
        ignore_global_filters: boolean;
    }> | Readonly<{} & {
        type: "reference_lines";
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
        sampling: number;
        ignore_global_filters: boolean;
        thresholds: (Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            fill?: "above" | "below" | undefined;
            field?: string | undefined;
            position?: "left" | "right" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
            axis?: "x" | "y" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            fill?: "above" | "below" | undefined;
            position?: "left" | "right" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
            axis?: "x" | "y" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            fill?: "above" | "below" | undefined;
            position?: "left" | "right" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
            axis?: "x" | "y" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            operation: "max" | "min" | "median" | "average" | "standard_deviation";
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            fill?: "above" | "below" | undefined;
            position?: "left" | "right" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
            axis?: "x" | "y" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            fill?: "above" | "below" | undefined;
            position?: "left" | "right" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
            axis?: "x" | "y" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
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
            fill?: "above" | "below" | undefined;
            position?: "left" | "right" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
            axis?: "x" | "y" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            percentile: number;
            operation: "percentile";
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            fill?: "above" | "below" | undefined;
            position?: "left" | "right" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
            axis?: "x" | "y" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            rank: number;
            operation: "percentile_rank";
        }> | Readonly<{
            fill?: "above" | "below" | undefined;
            position?: "left" | "right" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
            axis?: "x" | "y" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            value: number;
            operation: "static_value";
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            fill?: "above" | "below" | undefined;
            position?: "left" | "right" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
            axis?: "x" | "y" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            operation: "formula";
            formula: string;
        }>)[];
    }> | Readonly<{
        data_source?: import("@kbn/config-schema/src/types").ObjectResultUnionType<{
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
        }> | undefined;
    } & {
        type: "annotations";
        events: (Readonly<{
            line?: Readonly<{} & {
                stroke_width: number;
                stroke_dash: "dashed" | "dotted" | "solid";
            }> | undefined;
            visible?: boolean | undefined;
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
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            label?: string | undefined;
            extra_fields?: string[] | undefined;
        } & {
            type: "query";
            query: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }>;
            time_field: string;
        }> | Readonly<{
            line?: Readonly<{} & {
                stroke_width: number;
                stroke_dash: "dashed" | "dotted" | "solid";
            }> | undefined;
            visible?: boolean | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            label?: string | undefined;
        } & {
            type: "point";
            timestamp: string | number;
        }> | Readonly<{
            fill?: "inside" | "outside" | undefined;
            visible?: boolean | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            label?: string | undefined;
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
        language: "lucene" | "kql";
        expression: string;
    }> | undefined>;
    legend: import("@kbn/config-schema").Type<Readonly<{
        position?: "top" | "bottom" | undefined;
        statistics?: ("range" | "avg" | "max" | "min" | "total" | "count" | "median" | "difference" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "visible" | "auto" | undefined;
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
            visible?: boolean | undefined;
            text?: string | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        size?: "s" | "m" | "l" | "xl" | "auto" | undefined;
        position?: "left" | "right" | undefined;
        statistics?: ("range" | "avg" | "max" | "min" | "total" | "count" | "median" | "difference" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "visible" | "auto" | undefined;
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
            visible?: boolean | undefined;
            text?: string | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        position?: "top_left" | "bottom_right" | "top_right" | "bottom_left" | undefined;
        statistics?: ("range" | "avg" | "max" | "min" | "total" | "count" | "median" | "difference" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "visible" | "auto" | undefined;
        columns?: number | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        series_header?: Readonly<{
            visible?: boolean | undefined;
            text?: string | undefined;
        } & {}> | undefined;
    } & {
        placement: "inside";
    }> | undefined>;
    axis: import("@kbn/config-schema").Type<Readonly<{
        x?: Readonly<{
            title?: Readonly<{
                visible?: boolean | undefined;
                text?: string | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "linear" | "ordinal" | "temporal" | undefined;
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            domain?: Readonly<{
                rounding?: boolean | undefined;
            } & {
                type: "fit";
            }> | Readonly<{
                rounding?: boolean | undefined;
            } & {
                type: "custom";
                max: number;
                min: number;
            }> | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        y?: Readonly<{
            title?: Readonly<{
                visible?: boolean | undefined;
                text?: string | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
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
        y2?: Readonly<{
            title?: Readonly<{
                visible?: boolean | undefined;
                text?: string | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
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
            visibility?: "hidden" | "visible" | "auto" | undefined;
        } & {}> | undefined;
        fitting?: Readonly<{
            extend?: "none" | "nearest" | "zero" | undefined;
            emphasize?: boolean | undefined;
        } & {
            type: "none" | "average" | "linear" | "carry" | "lookahead" | "nearest" | "zero";
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
        }> | undefined;
        breakdown_by?: Readonly<{
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
        }> | undefined;
    } & {
        type: "line" | "area" | "bar" | "bar_stacked" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage";
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
        statistics?: ("range" | "avg" | "max" | "min" | "total" | "count" | "median" | "difference" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "visible" | "auto" | undefined;
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
            visible?: boolean | undefined;
            text?: string | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        size?: "s" | "m" | "l" | "xl" | "auto" | undefined;
        position?: "left" | "right" | undefined;
        statistics?: ("range" | "avg" | "max" | "min" | "total" | "count" | "median" | "difference" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "visible" | "auto" | undefined;
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
            visible?: boolean | undefined;
            text?: string | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        position?: "top_left" | "bottom_right" | "top_right" | "bottom_left" | undefined;
        statistics?: ("range" | "avg" | "max" | "min" | "total" | "count" | "median" | "difference" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "visible" | "auto" | undefined;
        columns?: number | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        series_header?: Readonly<{
            visible?: boolean | undefined;
            text?: string | undefined;
        } & {}> | undefined;
    } & {
        placement: "inside";
    }> | undefined>;
    axis: import("@kbn/config-schema").Type<Readonly<{
        x?: Readonly<{
            title?: Readonly<{
                visible?: boolean | undefined;
                text?: string | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "linear" | "ordinal" | "temporal" | undefined;
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            domain?: Readonly<{
                rounding?: boolean | undefined;
            } & {
                type: "fit";
            }> | Readonly<{
                rounding?: boolean | undefined;
            } & {
                type: "custom";
                max: number;
                min: number;
            }> | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        y?: Readonly<{
            title?: Readonly<{
                visible?: boolean | undefined;
                text?: string | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
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
        y2?: Readonly<{
            title?: Readonly<{
                visible?: boolean | undefined;
                text?: string | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
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
            visibility?: "hidden" | "visible" | "auto" | undefined;
        } & {}> | undefined;
        fitting?: Readonly<{
            extend?: "none" | "nearest" | "zero" | undefined;
            emphasize?: boolean | undefined;
        } & {
            type: "none" | "average" | "linear" | "carry" | "lookahead" | "nearest" | "zero";
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
        } & {
            fields: string[];
            limit: number;
            operation: "terms";
        }> | Readonly<{
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
            field: string;
            operation: "histogram";
            include_empty_rows: boolean;
            granularity: number | "auto";
        }> | Readonly<{
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
            field: string;
            ranges: Readonly<{
                gt?: number | undefined;
                lte?: number | undefined;
                label?: string | undefined;
            } & {}>[];
            operation: "range";
        }> | Readonly<{
            label?: string | undefined;
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
        }> | undefined;
        breakdown_by?: Readonly<{
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
            aggregate_first?: boolean | undefined;
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
            aggregate_first?: boolean | undefined;
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
        }> | undefined;
    } & {
        type: "line" | "area" | "bar" | "bar_stacked" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage";
        y: (Readonly<{
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
        } & {
            operation: "formula";
            formula: string;
        }>)[];
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
        sampling: number;
        ignore_global_filters: boolean;
    }> | Readonly<{} & {
        type: "reference_lines";
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
        sampling: number;
        ignore_global_filters: boolean;
        thresholds: (Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            fill?: "above" | "below" | undefined;
            field?: string | undefined;
            position?: "left" | "right" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
            axis?: "x" | "y" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            fill?: "above" | "below" | undefined;
            position?: "left" | "right" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
            axis?: "x" | "y" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            fill?: "above" | "below" | undefined;
            position?: "left" | "right" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
            axis?: "x" | "y" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            operation: "max" | "min" | "median" | "average" | "standard_deviation";
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            fill?: "above" | "below" | undefined;
            position?: "left" | "right" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
            axis?: "x" | "y" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            fill?: "above" | "below" | undefined;
            position?: "left" | "right" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
            axis?: "x" | "y" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
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
            fill?: "above" | "below" | undefined;
            position?: "left" | "right" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
            axis?: "x" | "y" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            percentile: number;
            operation: "percentile";
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            fill?: "above" | "below" | undefined;
            position?: "left" | "right" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
            axis?: "x" | "y" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            rank: number;
            operation: "percentile_rank";
        }> | Readonly<{
            fill?: "above" | "below" | undefined;
            position?: "left" | "right" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
            axis?: "x" | "y" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            value: number;
            operation: "static_value";
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            fill?: "above" | "below" | undefined;
            position?: "left" | "right" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
            axis?: "x" | "y" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            operation: "formula";
            formula: string;
        }>)[];
    }> | Readonly<{
        data_source?: import("@kbn/config-schema/src/types").ObjectResultUnionType<{
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
        }> | undefined;
    } & {
        type: "annotations";
        events: (Readonly<{
            line?: Readonly<{} & {
                stroke_width: number;
                stroke_dash: "dashed" | "dotted" | "solid";
            }> | undefined;
            visible?: boolean | undefined;
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
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            label?: string | undefined;
            extra_fields?: string[] | undefined;
        } & {
            type: "query";
            query: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }>;
            time_field: string;
        }> | Readonly<{
            line?: Readonly<{} & {
                stroke_width: number;
                stroke_dash: "dashed" | "dotted" | "solid";
            }> | undefined;
            visible?: boolean | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            label?: string | undefined;
        } & {
            type: "point";
            timestamp: string | number;
        }> | Readonly<{
            fill?: "inside" | "outside" | undefined;
            visible?: boolean | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            label?: string | undefined;
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
        language: "lucene" | "kql";
        expression: string;
    }> | undefined>;
    legend: import("@kbn/config-schema").Type<Readonly<{
        position?: "top" | "bottom" | undefined;
        statistics?: ("range" | "avg" | "max" | "min" | "total" | "count" | "median" | "difference" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "visible" | "auto" | undefined;
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
            visible?: boolean | undefined;
            text?: string | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        size?: "s" | "m" | "l" | "xl" | "auto" | undefined;
        position?: "left" | "right" | undefined;
        statistics?: ("range" | "avg" | "max" | "min" | "total" | "count" | "median" | "difference" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "visible" | "auto" | undefined;
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
            visible?: boolean | undefined;
            text?: string | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        position?: "top_left" | "bottom_right" | "top_right" | "bottom_left" | undefined;
        statistics?: ("range" | "avg" | "max" | "min" | "total" | "count" | "median" | "difference" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "visible" | "auto" | undefined;
        columns?: number | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        series_header?: Readonly<{
            visible?: boolean | undefined;
            text?: string | undefined;
        } & {}> | undefined;
    } & {
        placement: "inside";
    }> | undefined>;
    axis: import("@kbn/config-schema").Type<Readonly<{
        x?: Readonly<{
            title?: Readonly<{
                visible?: boolean | undefined;
                text?: string | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "linear" | "ordinal" | "temporal" | undefined;
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            domain?: Readonly<{
                rounding?: boolean | undefined;
            } & {
                type: "fit";
            }> | Readonly<{
                rounding?: boolean | undefined;
            } & {
                type: "custom";
                max: number;
                min: number;
            }> | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        y?: Readonly<{
            title?: Readonly<{
                visible?: boolean | undefined;
                text?: string | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
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
        y2?: Readonly<{
            title?: Readonly<{
                visible?: boolean | undefined;
                text?: string | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
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
            visibility?: "hidden" | "visible" | "auto" | undefined;
        } & {}> | undefined;
        fitting?: Readonly<{
            extend?: "none" | "nearest" | "zero" | undefined;
            emphasize?: boolean | undefined;
        } & {
            type: "none" | "average" | "linear" | "carry" | "lookahead" | "nearest" | "zero";
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
    type: import("@kbn/config-schema").Type<"xy">;
}>, import("@kbn/config-schema").ObjectType<{
    layers: import("@kbn/config-schema").Type<Readonly<{
        x?: Readonly<{
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
        }> | undefined;
        breakdown_by?: Readonly<{
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
        }> | undefined;
    } & {
        type: "line" | "area" | "bar" | "bar_stacked" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage";
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
        statistics?: ("range" | "avg" | "max" | "min" | "total" | "count" | "median" | "difference" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "visible" | "auto" | undefined;
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
            visible?: boolean | undefined;
            text?: string | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        size?: "s" | "m" | "l" | "xl" | "auto" | undefined;
        position?: "left" | "right" | undefined;
        statistics?: ("range" | "avg" | "max" | "min" | "total" | "count" | "median" | "difference" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "visible" | "auto" | undefined;
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
            visible?: boolean | undefined;
            text?: string | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        position?: "top_left" | "bottom_right" | "top_right" | "bottom_left" | undefined;
        statistics?: ("range" | "avg" | "max" | "min" | "total" | "count" | "median" | "difference" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "visible" | "auto" | undefined;
        columns?: number | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        series_header?: Readonly<{
            visible?: boolean | undefined;
            text?: string | undefined;
        } & {}> | undefined;
    } & {
        placement: "inside";
    }> | undefined>;
    axis: import("@kbn/config-schema").Type<Readonly<{
        x?: Readonly<{
            title?: Readonly<{
                visible?: boolean | undefined;
                text?: string | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "linear" | "ordinal" | "temporal" | undefined;
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            domain?: Readonly<{
                rounding?: boolean | undefined;
            } & {
                type: "fit";
            }> | Readonly<{
                rounding?: boolean | undefined;
            } & {
                type: "custom";
                max: number;
                min: number;
            }> | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        y?: Readonly<{
            title?: Readonly<{
                visible?: boolean | undefined;
                text?: string | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
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
        y2?: Readonly<{
            title?: Readonly<{
                visible?: boolean | undefined;
                text?: string | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
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
            visibility?: "hidden" | "visible" | "auto" | undefined;
        } & {}> | undefined;
        fitting?: Readonly<{
            extend?: "none" | "nearest" | "zero" | undefined;
            emphasize?: boolean | undefined;
        } & {
            type: "none" | "average" | "linear" | "carry" | "lookahead" | "nearest" | "zero";
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
    type: import("@kbn/config-schema").Type<"xy">;
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
        position?: "top" | "bottom" | undefined;
        statistics?: ("range" | "avg" | "max" | "min" | "total" | "count" | "median" | "difference" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "visible" | "auto" | undefined;
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
            visible?: boolean | undefined;
            text?: string | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        size?: "s" | "m" | "l" | "xl" | "auto" | undefined;
        position?: "left" | "right" | undefined;
        statistics?: ("range" | "avg" | "max" | "min" | "total" | "count" | "median" | "difference" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "visible" | "auto" | undefined;
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
            visible?: boolean | undefined;
            text?: string | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        position?: "top_left" | "bottom_right" | "top_right" | "bottom_left" | undefined;
        statistics?: ("range" | "avg" | "max" | "min" | "total" | "count" | "median" | "difference" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "visible" | "auto" | undefined;
        columns?: number | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        series_header?: Readonly<{
            visible?: boolean | undefined;
            text?: string | undefined;
        } & {}> | undefined;
    } & {
        placement: "inside";
    }> | undefined;
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
            visibility?: "hidden" | "visible" | "auto" | undefined;
        } & {}> | undefined;
        fitting?: Readonly<{
            extend?: "none" | "nearest" | "zero" | undefined;
            emphasize?: boolean | undefined;
        } & {
            type: "none" | "average" | "linear" | "carry" | "lookahead" | "nearest" | "zero";
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
        x?: Readonly<{
            title?: Readonly<{
                visible?: boolean | undefined;
                text?: string | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "linear" | "ordinal" | "temporal" | undefined;
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            domain?: Readonly<{
                rounding?: boolean | undefined;
            } & {
                type: "fit";
            }> | Readonly<{
                rounding?: boolean | undefined;
            } & {
                type: "custom";
                max: number;
                min: number;
            }> | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        y?: Readonly<{
            title?: Readonly<{
                visible?: boolean | undefined;
                text?: string | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
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
        y2?: Readonly<{
            title?: Readonly<{
                visible?: boolean | undefined;
                text?: string | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
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
        } & {
            fields: string[];
            limit: number;
            operation: "terms";
        }> | Readonly<{
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
            field: string;
            operation: "histogram";
            include_empty_rows: boolean;
            granularity: number | "auto";
        }> | Readonly<{
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
            field: string;
            ranges: Readonly<{
                gt?: number | undefined;
                lte?: number | undefined;
                label?: string | undefined;
            } & {}>[];
            operation: "range";
        }> | Readonly<{
            label?: string | undefined;
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
        }> | undefined;
        breakdown_by?: Readonly<{
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
            aggregate_first?: boolean | undefined;
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
            aggregate_first?: boolean | undefined;
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
        }> | undefined;
    } & {
        type: "line" | "area" | "bar" | "bar_stacked" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage";
        y: (Readonly<{
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
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
            axis?: "y" | "y2" | undefined;
        } & {
            operation: "formula";
            formula: string;
        }>)[];
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
        sampling: number;
        ignore_global_filters: boolean;
    }> | Readonly<{} & {
        type: "reference_lines";
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
        sampling: number;
        ignore_global_filters: boolean;
        thresholds: (Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            fill?: "above" | "below" | undefined;
            field?: string | undefined;
            position?: "left" | "right" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
            axis?: "x" | "y" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            operation: "count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            fill?: "above" | "below" | undefined;
            position?: "left" | "right" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
            axis?: "x" | "y" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            operation: "unique_count";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            fill?: "above" | "below" | undefined;
            position?: "left" | "right" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
            axis?: "x" | "y" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            operation: "max" | "min" | "median" | "average" | "standard_deviation";
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            fill?: "above" | "below" | undefined;
            position?: "left" | "right" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
            axis?: "x" | "y" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            operation: "sum";
            empty_as_null: boolean;
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            fill?: "above" | "below" | undefined;
            position?: "left" | "right" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
            axis?: "x" | "y" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
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
            fill?: "above" | "below" | undefined;
            position?: "left" | "right" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
            axis?: "x" | "y" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            percentile: number;
            operation: "percentile";
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            fill?: "above" | "below" | undefined;
            position?: "left" | "right" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
            axis?: "x" | "y" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            field: string;
            rank: number;
            operation: "percentile_rank";
        }> | Readonly<{
            fill?: "above" | "below" | undefined;
            position?: "left" | "right" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
            axis?: "x" | "y" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            value: number;
            operation: "static_value";
        }> | Readonly<{
            filter?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            fill?: "above" | "below" | undefined;
            position?: "left" | "right" | "auto" | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
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
            axis?: "x" | "y" | "y2" | undefined;
            stroke_width?: number | undefined;
            stroke_dash?: "dashed" | "dotted" | "solid" | undefined;
        } & {
            operation: "formula";
            formula: string;
        }>)[];
    }> | Readonly<{
        data_source?: import("@kbn/config-schema/src/types").ObjectResultUnionType<{
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
        }> | undefined;
    } & {
        type: "annotations";
        events: (Readonly<{
            line?: Readonly<{} & {
                stroke_width: number;
                stroke_dash: "dashed" | "dotted" | "solid";
            }> | undefined;
            visible?: boolean | undefined;
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
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            label?: string | undefined;
            extra_fields?: string[] | undefined;
        } & {
            type: "query";
            query: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }>;
            time_field: string;
        }> | Readonly<{
            line?: Readonly<{} & {
                stroke_width: number;
                stroke_dash: "dashed" | "dotted" | "solid";
            }> | undefined;
            visible?: boolean | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            text?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            icon?: "alert" | "asterisk" | "bell" | "bolt" | "bug" | "flag" | "heart" | "tag" | "circle" | "triangle" | "editor_comment" | "map_marker" | "star_empty" | "pin_filled" | "star_filled" | undefined;
            label?: string | undefined;
        } & {
            type: "point";
            timestamp: string | number;
        }> | Readonly<{
            fill?: "inside" | "outside" | undefined;
            visible?: boolean | undefined;
            color?: Readonly<{} & {
                type: "static";
                color: string;
            }> | Readonly<{} & {
                type: "auto";
            }> | undefined;
            label?: string | undefined;
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
        position?: "top" | "bottom" | undefined;
        statistics?: ("range" | "avg" | "max" | "min" | "total" | "count" | "median" | "difference" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "visible" | "auto" | undefined;
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
            visible?: boolean | undefined;
            text?: string | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        size?: "s" | "m" | "l" | "xl" | "auto" | undefined;
        position?: "left" | "right" | undefined;
        statistics?: ("range" | "avg" | "max" | "min" | "total" | "count" | "median" | "difference" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "visible" | "auto" | undefined;
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
            visible?: boolean | undefined;
            text?: string | undefined;
        } & {}> | undefined;
    } & {}> | Readonly<{
        position?: "top_left" | "bottom_right" | "top_right" | "bottom_left" | undefined;
        statistics?: ("range" | "avg" | "max" | "min" | "total" | "count" | "median" | "difference" | "last_value" | "variance" | "standard_deviation" | "last_non_null_value" | "first_value" | "first_non_null_value" | "difference_percentage" | "distinct_count" | "current_and_last_value")[] | undefined;
        visibility?: "hidden" | "visible" | "auto" | undefined;
        columns?: number | undefined;
        layout?: Readonly<{
            truncate?: Readonly<{
                enabled?: boolean | undefined;
                max_lines?: number | undefined;
            } & {}> | undefined;
        } & {
            type: "grid";
        }> | undefined;
        series_header?: Readonly<{
            visible?: boolean | undefined;
            text?: string | undefined;
        } & {}> | undefined;
    } & {
        placement: "inside";
    }> | undefined;
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
            visibility?: "hidden" | "visible" | "auto" | undefined;
        } & {}> | undefined;
        fitting?: Readonly<{
            extend?: "none" | "nearest" | "zero" | undefined;
            emphasize?: boolean | undefined;
        } & {
            type: "none" | "average" | "linear" | "carry" | "lookahead" | "nearest" | "zero";
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
        x?: Readonly<{
            title?: Readonly<{
                visible?: boolean | undefined;
                text?: string | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "linear" | "ordinal" | "temporal" | undefined;
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
            } & {}> | undefined;
            domain?: Readonly<{
                rounding?: boolean | undefined;
            } & {
                type: "fit";
            }> | Readonly<{
                rounding?: boolean | undefined;
            } & {
                type: "custom";
                max: number;
                min: number;
            }> | undefined;
            ticks?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
        } & {}> | undefined;
        y?: Readonly<{
            title?: Readonly<{
                visible?: boolean | undefined;
                text?: string | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
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
        y2?: Readonly<{
            title?: Readonly<{
                visible?: boolean | undefined;
                text?: string | undefined;
            } & {}> | undefined;
            grid?: Readonly<{} & {
                visible: boolean;
            }> | undefined;
            scale?: "log" | "linear" | "sqrt" | undefined;
            labels?: Readonly<{
                orientation?: "horizontal" | "vertical" | "angled" | undefined;
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
        }> | undefined;
        breakdown_by?: Readonly<{
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
        }> | undefined;
    } & {
        type: "line" | "area" | "bar" | "bar_stacked" | "area_stacked" | "bar_horizontal" | "bar_horizontal_stacked" | "area_percentage" | "bar_horizontal_percentage" | "bar_percentage";
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
