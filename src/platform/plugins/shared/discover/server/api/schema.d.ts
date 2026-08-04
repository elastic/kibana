import type { TypeOf } from '@kbn/config-schema';
import { UnifiedHistogramSuggestionType } from '@kbn/discover-utils';
export declare const MAX_SESSION_TITLE_LENGTH = 256;
export declare const MAX_SESSION_DESCRIPTION_LENGTH = 1000;
export declare const MAX_TAB_LABEL_LENGTH = 120;
export declare const MAX_BREAKDOWN_FIELD_LENGTH = 1000;
export declare const MAX_VIS_CONTEXT_ATTRIBUTE_KEY_LENGTH = 256;
export declare const MAX_DISCOVER_SESSION_CONTROL_PANELS = 100;
export declare const MAX_SEARCH_QUERY_LENGTH = 1000;
export declare const discoverSessionControlPanelsSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    id: string;
    type: "esql_control";
    width: "small" | "large" | "medium";
    grow: boolean;
    config: Readonly<{
        title?: string | undefined;
        display_settings?: Readonly<{
            placeholder?: string | undefined;
            hide_action_bar?: boolean | undefined;
            hide_exclude?: boolean | undefined;
            hide_exists?: boolean | undefined;
            hide_sort?: boolean | undefined;
        }> | undefined;
    } & {
        control_type: "STATIC_VALUES";
        available_options: string[];
        selected_options: string[];
        single_select: boolean;
        variable_name: string;
        variable_type: "values" | "fields" | "functions" | "time_literal" | "multi_values";
    }> | Readonly<{
        title?: string | undefined;
        display_settings?: Readonly<{
            placeholder?: string | undefined;
            hide_action_bar?: boolean | undefined;
            hide_exclude?: boolean | undefined;
            hide_exists?: boolean | undefined;
            hide_sort?: boolean | undefined;
        }> | undefined;
    } & {
        control_type: "VALUES_FROM_QUERY";
        selected_options: string[];
        single_select: boolean;
        variable_name: string;
        variable_type: "values" | "fields" | "functions" | "time_literal" | "multi_values";
        esql_query: string;
    }>;
}>[]>;
declare const discoverSessionClassicTabSchema: import("@kbn/config-schema").ObjectType<{
    hide_chart: import("@kbn/config-schema").Type<boolean>;
    hide_table: import("@kbn/config-schema").Type<boolean>;
    hide_aggregated_preview: import("@kbn/config-schema").Type<boolean | undefined>;
    breakdown_field: import("@kbn/config-schema").Type<string | undefined>;
    chart_interval: import("@kbn/config-schema").Type<"s" | "m" | "y" | "ms" | "auto" | "d" | "M" | "w" | "h" | undefined>;
    time_restore: import("@kbn/config-schema").Type<boolean>;
    time_range: import("@kbn/config-schema").Type<Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined>;
    refresh_interval: import("@kbn/config-schema").Type<Readonly<{} & {
        pause: boolean;
        value: number;
    }> | undefined>;
    vis_context: import("@kbn/config-schema").Type<Readonly<{} & {
        attributes: Record<string, any>;
        suggestion_type: UnifiedHistogramSuggestionType.lensSuggestion | UnifiedHistogramSuggestionType.histogramForESQL | UnifiedHistogramSuggestionType.histogramForDataView;
    }> | undefined>;
    control_panels: import("@kbn/config-schema").Type<Readonly<{} & {
        id: string;
        type: "esql_control";
        width: "small" | "large" | "medium";
        grow: boolean;
        config: Readonly<{
            title?: string | undefined;
            display_settings?: Readonly<{
                placeholder?: string | undefined;
                hide_action_bar?: boolean | undefined;
                hide_exclude?: boolean | undefined;
                hide_exists?: boolean | undefined;
                hide_sort?: boolean | undefined;
            }> | undefined;
        } & {
            control_type: "STATIC_VALUES";
            available_options: string[];
            selected_options: string[];
            single_select: boolean;
            variable_name: string;
            variable_type: "values" | "fields" | "functions" | "time_literal" | "multi_values";
        }> | Readonly<{
            title?: string | undefined;
            display_settings?: Readonly<{
                placeholder?: string | undefined;
                hide_action_bar?: boolean | undefined;
                hide_exclude?: boolean | undefined;
                hide_exists?: boolean | undefined;
                hide_sort?: boolean | undefined;
            }> | undefined;
        } & {
            control_type: "VALUES_FROM_QUERY";
            selected_options: string[];
            single_select: boolean;
            variable_name: string;
            variable_type: "values" | "fields" | "functions" | "time_literal" | "multi_values";
            esql_query: string;
        }>;
    }>[] | undefined>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        language: "lucene" | "kql";
        expression: string;
    }> | undefined>;
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
    })>[]>;
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
    view_mode: import("@kbn/config-schema").Type<import("@kbn/saved-search-plugin/common").VIEW_MODE>;
    rows_per_page: import("@kbn/config-schema").Type<number | undefined>;
    sample_size: import("@kbn/config-schema").Type<number | undefined>;
    column_order: import("@kbn/config-schema").Type<string[] | undefined>;
    column_settings: import("@kbn/config-schema").Type<Record<string, Readonly<{
        width?: number | undefined;
    } & {}>> | undefined>;
    sort: import("@kbn/config-schema").Type<Readonly<{} & {
        direction: "asc" | "desc";
        name: string;
    }>[]>;
    density: import("@kbn/config-schema").Type<import("@kbn/discover-utils").DataGridDensity | undefined>;
    header_row_height: import("@kbn/config-schema").Type<number | "auto" | undefined>;
    row_height: import("@kbn/config-schema").Type<number | "auto" | undefined>;
    id: import("@kbn/config-schema").Type<string>;
    label: import("@kbn/config-schema").Type<string>;
}>;
declare const discoverSessionEsqlTabSchema: import("@kbn/config-schema").ObjectType<{
    hide_chart: import("@kbn/config-schema").Type<boolean>;
    hide_table: import("@kbn/config-schema").Type<boolean>;
    hide_aggregated_preview: import("@kbn/config-schema").Type<boolean | undefined>;
    breakdown_field: import("@kbn/config-schema").Type<string | undefined>;
    chart_interval: import("@kbn/config-schema").Type<"s" | "m" | "y" | "ms" | "auto" | "d" | "M" | "w" | "h" | undefined>;
    time_restore: import("@kbn/config-schema").Type<boolean>;
    time_range: import("@kbn/config-schema").Type<Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined>;
    refresh_interval: import("@kbn/config-schema").Type<Readonly<{} & {
        pause: boolean;
        value: number;
    }> | undefined>;
    vis_context: import("@kbn/config-schema").Type<Readonly<{} & {
        attributes: Record<string, any>;
        suggestion_type: UnifiedHistogramSuggestionType.lensSuggestion | UnifiedHistogramSuggestionType.histogramForESQL | UnifiedHistogramSuggestionType.histogramForDataView;
    }> | undefined>;
    control_panels: import("@kbn/config-schema").Type<Readonly<{} & {
        id: string;
        type: "esql_control";
        width: "small" | "large" | "medium";
        grow: boolean;
        config: Readonly<{
            title?: string | undefined;
            display_settings?: Readonly<{
                placeholder?: string | undefined;
                hide_action_bar?: boolean | undefined;
                hide_exclude?: boolean | undefined;
                hide_exists?: boolean | undefined;
                hide_sort?: boolean | undefined;
            }> | undefined;
        } & {
            control_type: "STATIC_VALUES";
            available_options: string[];
            selected_options: string[];
            single_select: boolean;
            variable_name: string;
            variable_type: "values" | "fields" | "functions" | "time_literal" | "multi_values";
        }> | Readonly<{
            title?: string | undefined;
            display_settings?: Readonly<{
                placeholder?: string | undefined;
                hide_action_bar?: boolean | undefined;
                hide_exclude?: boolean | undefined;
                hide_exists?: boolean | undefined;
                hide_sort?: boolean | undefined;
            }> | undefined;
        } & {
            control_type: "VALUES_FROM_QUERY";
            selected_options: string[];
            single_select: boolean;
            variable_name: string;
            variable_type: "values" | "fields" | "functions" | "time_literal" | "multi_values";
            esql_query: string;
        }>;
    }>[] | undefined>;
    data_source: import("@kbn/config-schema").ObjectType<{
        type: import("@kbn/config-schema").Type<"esql">;
        query: import("@kbn/config-schema").Type<string>;
    }>;
    rows_per_page: import("@kbn/config-schema").Type<number | undefined>;
    sample_size: import("@kbn/config-schema").Type<number | undefined>;
    column_order: import("@kbn/config-schema").Type<string[] | undefined>;
    column_settings: import("@kbn/config-schema").Type<Record<string, Readonly<{
        width?: number | undefined;
    } & {}>> | undefined>;
    sort: import("@kbn/config-schema").Type<Readonly<{} & {
        direction: "asc" | "desc";
        name: string;
    }>[]>;
    density: import("@kbn/config-schema").Type<import("@kbn/discover-utils").DataGridDensity | undefined>;
    header_row_height: import("@kbn/config-schema").Type<number | "auto" | undefined>;
    row_height: import("@kbn/config-schema").Type<number | "auto" | undefined>;
    id: import("@kbn/config-schema").Type<string>;
    label: import("@kbn/config-schema").Type<string>;
}>;
declare const discoverSessionApiTabSchema: import("@kbn/config-schema").Type<Readonly<{
    query?: Readonly<{} & {
        language: "lucene" | "kql";
        expression: string;
    }> | undefined;
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
    refresh_interval?: Readonly<{} & {
        pause: boolean;
        value: number;
    }> | undefined;
    density?: import("@kbn/discover-utils").DataGridDensity | undefined;
    rows_per_page?: number | undefined;
    sample_size?: number | undefined;
    column_order?: string[] | undefined;
    column_settings?: Record<string, Readonly<{
        width?: number | undefined;
    } & {}>> | undefined;
    header_row_height?: number | "auto" | undefined;
    row_height?: number | "auto" | undefined;
    hide_aggregated_preview?: boolean | undefined;
    breakdown_field?: string | undefined;
    chart_interval?: "s" | "m" | "y" | "ms" | "auto" | "d" | "M" | "w" | "h" | undefined;
    vis_context?: Readonly<{} & {
        attributes: Record<string, any>;
        suggestion_type: UnifiedHistogramSuggestionType.lensSuggestion | UnifiedHistogramSuggestionType.histogramForESQL | UnifiedHistogramSuggestionType.histogramForDataView;
    }> | undefined;
    control_panels?: Readonly<{} & {
        id: string;
        type: "esql_control";
        width: "small" | "large" | "medium";
        grow: boolean;
        config: Readonly<{
            title?: string | undefined;
            display_settings?: Readonly<{
                placeholder?: string | undefined;
                hide_action_bar?: boolean | undefined;
                hide_exclude?: boolean | undefined;
                hide_exists?: boolean | undefined;
                hide_sort?: boolean | undefined;
            }> | undefined;
        } & {
            control_type: "STATIC_VALUES";
            available_options: string[];
            selected_options: string[];
            single_select: boolean;
            variable_name: string;
            variable_type: "values" | "fields" | "functions" | "time_literal" | "multi_values";
        }> | Readonly<{
            title?: string | undefined;
            display_settings?: Readonly<{
                placeholder?: string | undefined;
                hide_action_bar?: boolean | undefined;
                hide_exclude?: boolean | undefined;
                hide_exists?: boolean | undefined;
                hide_sort?: boolean | undefined;
            }> | undefined;
        } & {
            control_type: "VALUES_FROM_QUERY";
            selected_options: string[];
            single_select: boolean;
            variable_name: string;
            variable_type: "values" | "fields" | "functions" | "time_literal" | "multi_values";
            esql_query: string;
        }>;
    }>[] | undefined;
} & {
    sort: Readonly<{} & {
        direction: "asc" | "desc";
        name: string;
    }>[];
    id: string;
    filters: import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
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
    })>[];
    label: string;
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
    view_mode: import("@kbn/saved-search-plugin/common").VIEW_MODE;
    hide_chart: boolean;
    hide_table: boolean;
    time_restore: boolean;
}> | Readonly<{
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
    refresh_interval?: Readonly<{} & {
        pause: boolean;
        value: number;
    }> | undefined;
    density?: import("@kbn/discover-utils").DataGridDensity | undefined;
    rows_per_page?: number | undefined;
    sample_size?: number | undefined;
    column_order?: string[] | undefined;
    column_settings?: Record<string, Readonly<{
        width?: number | undefined;
    } & {}>> | undefined;
    header_row_height?: number | "auto" | undefined;
    row_height?: number | "auto" | undefined;
    hide_aggregated_preview?: boolean | undefined;
    breakdown_field?: string | undefined;
    chart_interval?: "s" | "m" | "y" | "ms" | "auto" | "d" | "M" | "w" | "h" | undefined;
    vis_context?: Readonly<{} & {
        attributes: Record<string, any>;
        suggestion_type: UnifiedHistogramSuggestionType.lensSuggestion | UnifiedHistogramSuggestionType.histogramForESQL | UnifiedHistogramSuggestionType.histogramForDataView;
    }> | undefined;
    control_panels?: Readonly<{} & {
        id: string;
        type: "esql_control";
        width: "small" | "large" | "medium";
        grow: boolean;
        config: Readonly<{
            title?: string | undefined;
            display_settings?: Readonly<{
                placeholder?: string | undefined;
                hide_action_bar?: boolean | undefined;
                hide_exclude?: boolean | undefined;
                hide_exists?: boolean | undefined;
                hide_sort?: boolean | undefined;
            }> | undefined;
        } & {
            control_type: "STATIC_VALUES";
            available_options: string[];
            selected_options: string[];
            single_select: boolean;
            variable_name: string;
            variable_type: "values" | "fields" | "functions" | "time_literal" | "multi_values";
        }> | Readonly<{
            title?: string | undefined;
            display_settings?: Readonly<{
                placeholder?: string | undefined;
                hide_action_bar?: boolean | undefined;
                hide_exclude?: boolean | undefined;
                hide_exists?: boolean | undefined;
                hide_sort?: boolean | undefined;
            }> | undefined;
        } & {
            control_type: "VALUES_FROM_QUERY";
            selected_options: string[];
            single_select: boolean;
            variable_name: string;
            variable_type: "values" | "fields" | "functions" | "time_literal" | "multi_values";
            esql_query: string;
        }>;
    }>[] | undefined;
} & {
    sort: Readonly<{} & {
        direction: "asc" | "desc";
        name: string;
    }>[];
    id: string;
    label: string;
    data_source: Readonly<{} & {
        type: "esql";
        query: string;
    }>;
    hide_chart: boolean;
    hide_table: boolean;
    time_restore: boolean;
}>>;
export declare const discoverSessionApiDataSchema: import("@kbn/config-schema").ObjectType<{
    title: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string>;
    tabs: import("@kbn/config-schema").Type<(Readonly<{
        query?: Readonly<{} & {
            language: "lucene" | "kql";
            expression: string;
        }> | undefined;
        time_range?: Readonly<{
            mode?: "absolute" | "relative" | undefined;
        } & {
            from: string;
            to: string;
        }> | undefined;
        refresh_interval?: Readonly<{} & {
            pause: boolean;
            value: number;
        }> | undefined;
        density?: import("@kbn/discover-utils").DataGridDensity | undefined;
        rows_per_page?: number | undefined;
        sample_size?: number | undefined;
        column_order?: string[] | undefined;
        column_settings?: Record<string, Readonly<{
            width?: number | undefined;
        } & {}>> | undefined;
        header_row_height?: number | "auto" | undefined;
        row_height?: number | "auto" | undefined;
        hide_aggregated_preview?: boolean | undefined;
        breakdown_field?: string | undefined;
        chart_interval?: "s" | "m" | "y" | "ms" | "auto" | "d" | "M" | "w" | "h" | undefined;
        vis_context?: Readonly<{} & {
            attributes: Record<string, any>;
            suggestion_type: UnifiedHistogramSuggestionType.lensSuggestion | UnifiedHistogramSuggestionType.histogramForESQL | UnifiedHistogramSuggestionType.histogramForDataView;
        }> | undefined;
        control_panels?: Readonly<{} & {
            id: string;
            type: "esql_control";
            width: "small" | "large" | "medium";
            grow: boolean;
            config: Readonly<{
                title?: string | undefined;
                display_settings?: Readonly<{
                    placeholder?: string | undefined;
                    hide_action_bar?: boolean | undefined;
                    hide_exclude?: boolean | undefined;
                    hide_exists?: boolean | undefined;
                    hide_sort?: boolean | undefined;
                }> | undefined;
            } & {
                control_type: "STATIC_VALUES";
                available_options: string[];
                selected_options: string[];
                single_select: boolean;
                variable_name: string;
                variable_type: "values" | "fields" | "functions" | "time_literal" | "multi_values";
            }> | Readonly<{
                title?: string | undefined;
                display_settings?: Readonly<{
                    placeholder?: string | undefined;
                    hide_action_bar?: boolean | undefined;
                    hide_exclude?: boolean | undefined;
                    hide_exists?: boolean | undefined;
                    hide_sort?: boolean | undefined;
                }> | undefined;
            } & {
                control_type: "VALUES_FROM_QUERY";
                selected_options: string[];
                single_select: boolean;
                variable_name: string;
                variable_type: "values" | "fields" | "functions" | "time_literal" | "multi_values";
                esql_query: string;
            }>;
        }>[] | undefined;
    } & {
        sort: Readonly<{} & {
            direction: "asc" | "desc";
            name: string;
        }>[];
        id: string;
        filters: import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
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
        })>[];
        label: string;
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
        view_mode: import("@kbn/saved-search-plugin/common").VIEW_MODE;
        hide_chart: boolean;
        hide_table: boolean;
        time_restore: boolean;
    }> | Readonly<{
        time_range?: Readonly<{
            mode?: "absolute" | "relative" | undefined;
        } & {
            from: string;
            to: string;
        }> | undefined;
        refresh_interval?: Readonly<{} & {
            pause: boolean;
            value: number;
        }> | undefined;
        density?: import("@kbn/discover-utils").DataGridDensity | undefined;
        rows_per_page?: number | undefined;
        sample_size?: number | undefined;
        column_order?: string[] | undefined;
        column_settings?: Record<string, Readonly<{
            width?: number | undefined;
        } & {}>> | undefined;
        header_row_height?: number | "auto" | undefined;
        row_height?: number | "auto" | undefined;
        hide_aggregated_preview?: boolean | undefined;
        breakdown_field?: string | undefined;
        chart_interval?: "s" | "m" | "y" | "ms" | "auto" | "d" | "M" | "w" | "h" | undefined;
        vis_context?: Readonly<{} & {
            attributes: Record<string, any>;
            suggestion_type: UnifiedHistogramSuggestionType.lensSuggestion | UnifiedHistogramSuggestionType.histogramForESQL | UnifiedHistogramSuggestionType.histogramForDataView;
        }> | undefined;
        control_panels?: Readonly<{} & {
            id: string;
            type: "esql_control";
            width: "small" | "large" | "medium";
            grow: boolean;
            config: Readonly<{
                title?: string | undefined;
                display_settings?: Readonly<{
                    placeholder?: string | undefined;
                    hide_action_bar?: boolean | undefined;
                    hide_exclude?: boolean | undefined;
                    hide_exists?: boolean | undefined;
                    hide_sort?: boolean | undefined;
                }> | undefined;
            } & {
                control_type: "STATIC_VALUES";
                available_options: string[];
                selected_options: string[];
                single_select: boolean;
                variable_name: string;
                variable_type: "values" | "fields" | "functions" | "time_literal" | "multi_values";
            }> | Readonly<{
                title?: string | undefined;
                display_settings?: Readonly<{
                    placeholder?: string | undefined;
                    hide_action_bar?: boolean | undefined;
                    hide_exclude?: boolean | undefined;
                    hide_exists?: boolean | undefined;
                    hide_sort?: boolean | undefined;
                }> | undefined;
            } & {
                control_type: "VALUES_FROM_QUERY";
                selected_options: string[];
                single_select: boolean;
                variable_name: string;
                variable_type: "values" | "fields" | "functions" | "time_literal" | "multi_values";
                esql_query: string;
            }>;
        }>[] | undefined;
    } & {
        sort: Readonly<{} & {
            direction: "asc" | "desc";
            name: string;
        }>[];
        id: string;
        label: string;
        data_source: Readonly<{} & {
            type: "esql";
            query: string;
        }>;
        hide_chart: boolean;
        hide_table: boolean;
        time_restore: boolean;
    }>)[]>;
}>;
export declare const discoverSessionApiResponseSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    data: import("@kbn/config-schema").ObjectType<{
        title: import("@kbn/config-schema").Type<string>;
        description: import("@kbn/config-schema").Type<string>;
        tabs: import("@kbn/config-schema").Type<(Readonly<{
            query?: Readonly<{} & {
                language: "lucene" | "kql";
                expression: string;
            }> | undefined;
            time_range?: Readonly<{
                mode?: "absolute" | "relative" | undefined;
            } & {
                from: string;
                to: string;
            }> | undefined;
            refresh_interval?: Readonly<{} & {
                pause: boolean;
                value: number;
            }> | undefined;
            density?: import("@kbn/discover-utils").DataGridDensity | undefined;
            rows_per_page?: number | undefined;
            sample_size?: number | undefined;
            column_order?: string[] | undefined;
            column_settings?: Record<string, Readonly<{
                width?: number | undefined;
            } & {}>> | undefined;
            header_row_height?: number | "auto" | undefined;
            row_height?: number | "auto" | undefined;
            hide_aggregated_preview?: boolean | undefined;
            breakdown_field?: string | undefined;
            chart_interval?: "s" | "m" | "y" | "ms" | "auto" | "d" | "M" | "w" | "h" | undefined;
            vis_context?: Readonly<{} & {
                attributes: Record<string, any>;
                suggestion_type: UnifiedHistogramSuggestionType.lensSuggestion | UnifiedHistogramSuggestionType.histogramForESQL | UnifiedHistogramSuggestionType.histogramForDataView;
            }> | undefined;
            control_panels?: Readonly<{} & {
                id: string;
                type: "esql_control";
                width: "small" | "large" | "medium";
                grow: boolean;
                config: Readonly<{
                    title?: string | undefined;
                    display_settings?: Readonly<{
                        placeholder?: string | undefined;
                        hide_action_bar?: boolean | undefined;
                        hide_exclude?: boolean | undefined;
                        hide_exists?: boolean | undefined;
                        hide_sort?: boolean | undefined;
                    }> | undefined;
                } & {
                    control_type: "STATIC_VALUES";
                    available_options: string[];
                    selected_options: string[];
                    single_select: boolean;
                    variable_name: string;
                    variable_type: "values" | "fields" | "functions" | "time_literal" | "multi_values";
                }> | Readonly<{
                    title?: string | undefined;
                    display_settings?: Readonly<{
                        placeholder?: string | undefined;
                        hide_action_bar?: boolean | undefined;
                        hide_exclude?: boolean | undefined;
                        hide_exists?: boolean | undefined;
                        hide_sort?: boolean | undefined;
                    }> | undefined;
                } & {
                    control_type: "VALUES_FROM_QUERY";
                    selected_options: string[];
                    single_select: boolean;
                    variable_name: string;
                    variable_type: "values" | "fields" | "functions" | "time_literal" | "multi_values";
                    esql_query: string;
                }>;
            }>[] | undefined;
        } & {
            sort: Readonly<{} & {
                direction: "asc" | "desc";
                name: string;
            }>[];
            id: string;
            filters: import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
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
            })>[];
            label: string;
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
            view_mode: import("@kbn/saved-search-plugin/common").VIEW_MODE;
            hide_chart: boolean;
            hide_table: boolean;
            time_restore: boolean;
        }> | Readonly<{
            time_range?: Readonly<{
                mode?: "absolute" | "relative" | undefined;
            } & {
                from: string;
                to: string;
            }> | undefined;
            refresh_interval?: Readonly<{} & {
                pause: boolean;
                value: number;
            }> | undefined;
            density?: import("@kbn/discover-utils").DataGridDensity | undefined;
            rows_per_page?: number | undefined;
            sample_size?: number | undefined;
            column_order?: string[] | undefined;
            column_settings?: Record<string, Readonly<{
                width?: number | undefined;
            } & {}>> | undefined;
            header_row_height?: number | "auto" | undefined;
            row_height?: number | "auto" | undefined;
            hide_aggregated_preview?: boolean | undefined;
            breakdown_field?: string | undefined;
            chart_interval?: "s" | "m" | "y" | "ms" | "auto" | "d" | "M" | "w" | "h" | undefined;
            vis_context?: Readonly<{} & {
                attributes: Record<string, any>;
                suggestion_type: UnifiedHistogramSuggestionType.lensSuggestion | UnifiedHistogramSuggestionType.histogramForESQL | UnifiedHistogramSuggestionType.histogramForDataView;
            }> | undefined;
            control_panels?: Readonly<{} & {
                id: string;
                type: "esql_control";
                width: "small" | "large" | "medium";
                grow: boolean;
                config: Readonly<{
                    title?: string | undefined;
                    display_settings?: Readonly<{
                        placeholder?: string | undefined;
                        hide_action_bar?: boolean | undefined;
                        hide_exclude?: boolean | undefined;
                        hide_exists?: boolean | undefined;
                        hide_sort?: boolean | undefined;
                    }> | undefined;
                } & {
                    control_type: "STATIC_VALUES";
                    available_options: string[];
                    selected_options: string[];
                    single_select: boolean;
                    variable_name: string;
                    variable_type: "values" | "fields" | "functions" | "time_literal" | "multi_values";
                }> | Readonly<{
                    title?: string | undefined;
                    display_settings?: Readonly<{
                        placeholder?: string | undefined;
                        hide_action_bar?: boolean | undefined;
                        hide_exclude?: boolean | undefined;
                        hide_exists?: boolean | undefined;
                        hide_sort?: boolean | undefined;
                    }> | undefined;
                } & {
                    control_type: "VALUES_FROM_QUERY";
                    selected_options: string[];
                    single_select: boolean;
                    variable_name: string;
                    variable_type: "values" | "fields" | "functions" | "time_literal" | "multi_values";
                    esql_query: string;
                }>;
            }>[] | undefined;
        } & {
            sort: Readonly<{} & {
                direction: "asc" | "desc";
                name: string;
            }>[];
            id: string;
            label: string;
            data_source: Readonly<{} & {
                type: "esql";
                query: string;
            }>;
            hide_chart: boolean;
            hide_table: boolean;
            time_restore: boolean;
        }>)[]>;
    }>;
    meta: import("@kbn/config-schema").ObjectType<{
        created_at: import("@kbn/config-schema").Type<string | undefined>;
        created_by: import("@kbn/config-schema").Type<string | undefined>;
        managed: import("@kbn/config-schema").Type<boolean | undefined>;
        owner: import("@kbn/config-schema").Type<string | undefined>;
        updated_at: import("@kbn/config-schema").Type<string | undefined>;
        updated_by: import("@kbn/config-schema").Type<string | undefined>;
        version: import("@kbn/config-schema").Type<string | undefined>;
    }>;
}>;
export declare const discoverSessionSearchParamsSchema: import("@kbn/config-schema").ObjectType<Omit<{
    page: import("@kbn/config-schema").Type<number>;
    per_page: import("@kbn/config-schema").Type<number>;
}, "query"> & {
    query: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const discoverSessionSearchResponseSchema: import("@kbn/config-schema").ObjectType<{
    data: import("@kbn/config-schema").Type<Readonly<{} & {
        meta: Readonly<{
            version?: string | undefined;
            managed?: boolean | undefined;
            created_at?: string | undefined;
            created_by?: string | undefined;
            updated_at?: string | undefined;
            updated_by?: string | undefined;
            owner?: string | undefined;
        } & {}>;
        id: string;
        data: Readonly<{
            description?: string | undefined;
        } & {
            title: string;
        }>;
    }>[]>;
    meta: import("@kbn/config-schema").ObjectType<{
        page: import("@kbn/config-schema").Type<number>;
        per_page: import("@kbn/config-schema").Type<number>;
        total: import("@kbn/config-schema").Type<number>;
    }>;
}>;
export type DiscoverSessionApiData = TypeOf<typeof discoverSessionApiDataSchema>;
export type DiscoverSessionApiResponse = TypeOf<typeof discoverSessionApiResponseSchema>;
export type DiscoverSessionSearchParams = TypeOf<typeof discoverSessionSearchParamsSchema>;
export type DiscoverSessionSearchResponse = TypeOf<typeof discoverSessionSearchResponseSchema>;
export type DiscoverSessionApiClassicTab = TypeOf<typeof discoverSessionClassicTabSchema>;
export type DiscoverSessionApiEsqlTab = TypeOf<typeof discoverSessionEsqlTabSchema>;
export type DiscoverSessionApiTab = TypeOf<typeof discoverSessionApiTabSchema>;
export type DiscoverSessionControlPanels = TypeOf<typeof discoverSessionControlPanelsSchema>;
export {};
