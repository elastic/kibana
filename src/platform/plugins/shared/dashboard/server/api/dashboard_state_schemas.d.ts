import type { ObjectType, Type } from '@kbn/config-schema';
export declare const panelGridSchema: ObjectType<{
    x: Type<number>;
    y: Type<number>;
    w: Type<number>;
    h: Type<number>;
}>;
export declare function getPanelSchema(isDashboardAppRequest: boolean): ObjectType<{
    type: Type<string>;
    config: ObjectType<{}>;
    grid: ObjectType<{
        x: Type<number>;
        y: Type<number>;
        w: Type<number>;
        h: Type<number>;
    }>;
    id: Type<string | undefined>;
}> | Type<Readonly<{
    id?: string | undefined;
    version?: string | undefined;
} & {
    type: string;
    grid: Readonly<{} & {
        h: number;
        w: number;
        y: number;
        x: number;
    }>;
    config: Readonly<{} & {}>;
}>>;
export declare function getSectionSchema(isDashboardAppRequest: boolean): ObjectType<{
    title: Type<string>;
    collapsed: Type<boolean>;
    grid: ObjectType<{
        y: Type<number>;
    }>;
    panels: Type<Readonly<{
        id?: string | undefined;
    } & {
        type: string;
        grid: Readonly<{} & {
            h: number;
            w: number;
            y: number;
            x: number;
        }>;
        config: Readonly<{} & {}>;
    }>[]>;
    id: Type<string | undefined>;
}>;
export declare const optionsSchema: ObjectType<{
    auto_apply_filters: Type<boolean>;
    hide_panel_titles: Type<boolean>;
    hide_panel_borders: Type<boolean>;
    use_margins: Type<boolean>;
    sync_colors: Type<boolean>;
    sync_tooltips: Type<boolean>;
    sync_cursor: Type<boolean>;
}>;
export declare const accessControlSchema: Type<Readonly<{
    access_mode?: "default" | "write_restricted" | undefined;
} & {}> | undefined>;
export declare function getDashboardStateSchema(isDashboardAppRequest: boolean): ObjectType<{
    pinned_panels: Type<(Readonly<{
        id?: string | undefined;
    } & {
        type: "esql_control";
        width: "medium" | "small" | "large";
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
    }> | Readonly<{
        id?: string | undefined;
    } & {
        type: "options_list_control";
        width: "medium" | "small" | "large";
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
            sort: Readonly<{} & {
                by: "_count" | "_key";
                direction: "desc" | "asc";
            }>;
            exclude: boolean;
            selected_options: (string | number)[];
            single_select: boolean;
            field_name: string;
            exists_selected: boolean;
            run_past_timeout: boolean;
            search_technique: "prefix" | "wildcard" | "exact";
            data_view_id: string;
            use_global_filters: boolean;
            ignore_validations: boolean;
        }>;
    }> | Readonly<{
        id?: string | undefined;
    } & {
        type: "range_slider_control";
        width: "medium" | "small" | "large";
        grow: boolean;
        config: Readonly<{
            title?: string | undefined;
            value?: string[] | undefined;
        } & {
            step: number;
            field_name: string;
            data_view_id: string;
            use_global_filters: boolean;
            ignore_validations: boolean;
        }>;
    }> | Readonly<{
        id?: string | undefined;
    } & {
        type: "time_slider_control";
        width: "medium" | "small" | "large";
        grow: boolean;
        config: Readonly<{} & {
            start_percentage_of_time_range: number;
            end_percentage_of_time_range: number;
            is_anchored: boolean;
        }>;
    }>)[]>;
    description: Type<string | undefined>;
    filters: Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
        disabled: Type<boolean | undefined>;
        negate: Type<boolean | undefined>;
        controlled_by: Type<string | undefined>;
        data_view_id: Type<string | undefined>;
        label: Type<string | undefined>;
        is_multi_index: Type<boolean | undefined>;
    }, "type" | "condition"> & {
        type: Type<"condition">;
        condition: Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
            field: Type<string>;
            negate: Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: Type<string | number | boolean>;
            operator: Type<"is">;
        }) | (Omit<{
            field: Type<string>;
            negate: Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: Type<string[] | number[] | boolean[]>;
            operator: Type<"is_one_of">;
        }) | (Omit<{
            field: Type<string>;
            negate: Type<boolean | undefined>;
        }, "value" | "operator"> & {
            value: ObjectType<{
                gte: Type<string | number | undefined>;
                lte: Type<string | number | undefined>;
                gt: Type<string | number | undefined>;
                lt: Type<string | number | undefined>;
                format: Type<string | undefined>;
            }>;
            operator: Type<"range">;
        }) | (Omit<{
            field: Type<string>;
            negate: Type<boolean | undefined>;
        }, "operator"> & {
            operator: Type<"exists">;
        })>>;
    }) | (Omit<{
        disabled: Type<boolean | undefined>;
        negate: Type<boolean | undefined>;
        controlled_by: Type<string | undefined>;
        data_view_id: Type<string | undefined>;
        label: Type<string | undefined>;
        is_multi_index: Type<boolean | undefined>;
    }, "type" | "group"> & {
        type: Type<"group">;
        group: ObjectType<{
            operator: Type<"and" | "or">;
            conditions: Type<(import("@kbn/config-schema/src/types").ObjectResultUnionType<(Omit<{
                field: Type<string>;
                negate: Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: Type<string | number | boolean>;
                operator: Type<"is">;
            }) | (Omit<{
                field: Type<string>;
                negate: Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: Type<string[] | number[] | boolean[]>;
                operator: Type<"is_one_of">;
            }) | (Omit<{
                field: Type<string>;
                negate: Type<boolean | undefined>;
            }, "value" | "operator"> & {
                value: ObjectType<{
                    gte: Type<string | number | undefined>;
                    lte: Type<string | number | undefined>;
                    gt: Type<string | number | undefined>;
                    lt: Type<string | number | undefined>;
                    format: Type<string | undefined>;
                }>;
                operator: Type<"range">;
            }) | (Omit<{
                field: Type<string>;
                negate: Type<boolean | undefined>;
            }, "operator"> & {
                operator: Type<"exists">;
            })> | import("@kbn/as-code-filters-schema").AsCodeGroupFilterRecursive)[]>;
        }>;
    }) | (Omit<{
        disabled: Type<boolean | undefined>;
        negate: Type<boolean | undefined>;
        controlled_by: Type<string | undefined>;
        data_view_id: Type<string | undefined>;
        label: Type<string | undefined>;
        is_multi_index: Type<boolean | undefined>;
    }, "type" | "field" | "params" | "dsl"> & {
        type: Type<"dsl">;
        field: Type<string | undefined>;
        params: Type<any>;
        dsl: Type<Record<string, any>>;
    }) | (Omit<{
        disabled: Type<boolean | undefined>;
        negate: Type<boolean | undefined>;
        controlled_by: Type<string | undefined>;
        data_view_id: Type<string | undefined>;
        label: Type<string | undefined>;
        is_multi_index: Type<boolean | undefined>;
    }, "type" | "dsl"> & {
        type: Type<"spatial">;
        dsl: Type<Record<string, any>>;
    })>[] | undefined>;
    options: ObjectType<{
        auto_apply_filters: Type<boolean>;
        hide_panel_titles: Type<boolean>;
        hide_panel_borders: Type<boolean>;
        use_margins: Type<boolean>;
        sync_colors: Type<boolean>;
        sync_tooltips: Type<boolean>;
        sync_cursor: Type<boolean>;
    }>;
    panels: Type<(Readonly<{
        id?: string | undefined;
    } & {
        type: string;
        grid: Readonly<{} & {
            h: number;
            w: number;
            y: number;
            x: number;
        }>;
        config: Readonly<{} & {}>;
    }> | Readonly<{
        id?: string | undefined;
    } & {
        grid: Readonly<{} & {
            y: number;
        }>;
        title: string;
        panels: Readonly<{
            id?: string | undefined;
        } & {
            type: string;
            grid: Readonly<{} & {
                h: number;
                w: number;
                y: number;
                x: number;
            }>;
            config: Readonly<{} & {}>;
        }>[];
        collapsed: boolean;
    }>)[]>;
    project_routing: Type<string | undefined>;
    query: Type<Readonly<{} & {
        expression: string;
        language: "kql" | "lucene";
    }> | undefined>;
    refresh_interval: Type<Readonly<{} & {
        pause: boolean;
        value: number;
    }> | undefined>;
    tags: Type<string[] | undefined>;
    time_range: Type<Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined>;
    title: Type<string>;
    access_control: Type<Readonly<{
        access_mode?: "default" | "write_restricted" | undefined;
    } & {}> | undefined>;
}>;
