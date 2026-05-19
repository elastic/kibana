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
    config: Readonly<{} & {}>;
    type: string;
    grid: Readonly<{} & {
        y: number;
        w: number;
        h: number;
        x: number;
    }>;
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
        config: Readonly<{} & {}>;
        type: string;
        grid: Readonly<{} & {
            y: number;
            w: number;
            h: number;
            x: number;
        }>;
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
    pinned_panels: Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<{
        id: Type<string | undefined>;
        width: Type<"small" | "medium" | "large">;
        grow: Type<boolean>;
        type: Type<"esql_control">;
        config: Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<{
            control_type: Type<"STATIC_VALUES">;
            available_options: Type<string[]>;
            selected_options: Type<string[]>;
            single_select: Type<boolean>;
            variable_name: Type<string>;
            variable_type: Type<"fields" | "values" | "functions" | "time_literal" | "multi_values">;
            display_settings: Type<Readonly<{
                placeholder?: string | undefined;
                hide_action_bar?: boolean | undefined;
                hide_exclude?: boolean | undefined;
                hide_exists?: boolean | undefined;
                hide_sort?: boolean | undefined;
            } & {}> | undefined>;
            title: Type<string | undefined>;
        } | {
            control_type: Type<"VALUES_FROM_QUERY">;
            esql_query: Type<string>;
            selected_options: Type<string[]>;
            single_select: Type<boolean>;
            variable_name: Type<string>;
            variable_type: Type<"fields" | "values" | "functions" | "time_literal" | "multi_values">;
            display_settings: Type<Readonly<{
                placeholder?: string | undefined;
                hide_action_bar?: boolean | undefined;
                hide_exclude?: boolean | undefined;
                hide_exists?: boolean | undefined;
                hide_sort?: boolean | undefined;
            } & {}> | undefined>;
            title: Type<string | undefined>;
        }>>;
    } | {
        id: Type<string | undefined>;
        width: Type<"small" | "medium" | "large">;
        grow: Type<boolean>;
        type: Type<"options_list_control">;
        config: ObjectType<{
            exclude: Type<boolean>;
            exists_selected: Type<boolean>;
            run_past_timeout: Type<boolean>;
            search_technique: Type<"prefix" | "exact" | "wildcard">;
            selected_options: Type<(string | number)[]>;
            single_select: Type<boolean>;
            sort: ObjectType<{
                by: Type<"_count" | "_key">;
                direction: Type<"asc" | "desc">;
            }>;
            data_view_id: Type<string>;
            field_name: Type<string>;
            use_global_filters: Type<boolean>;
            ignore_validations: Type<boolean>;
            title: Type<string | undefined>;
            display_settings: Type<Readonly<{
                placeholder?: string | undefined;
                hide_action_bar?: boolean | undefined;
                hide_exclude?: boolean | undefined;
                hide_exists?: boolean | undefined;
                hide_sort?: boolean | undefined;
            } & {}> | undefined>;
        }>;
    } | {
        id: Type<string | undefined>;
        width: Type<"small" | "medium" | "large">;
        grow: Type<boolean>;
        type: Type<"range_slider_control">;
        config: ObjectType<{
            value: Type<string[] | undefined>;
            step: Type<number>;
            data_view_id: Type<string>;
            field_name: Type<string>;
            use_global_filters: Type<boolean>;
            ignore_validations: Type<boolean>;
            title: Type<string | undefined>;
        }>;
    } | {
        id: Type<string | undefined>;
        width: Type<"small" | "medium" | "large">;
        grow: Type<boolean>;
        type: Type<"time_slider_control">;
        config: ObjectType<{
            start_percentage_of_time_range: Type<number>;
            end_percentage_of_time_range: Type<number>;
            is_anchored: Type<boolean>;
        }>;
    }>[]>;
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
    }, "type" | "params" | "field" | "dsl"> & {
        type: Type<"dsl">;
        params: Type<any>;
        field: Type<string | undefined>;
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
        config: Readonly<{} & {}>;
        type: string;
        grid: Readonly<{} & {
            y: number;
            w: number;
            h: number;
            x: number;
        }>;
    }> | Readonly<{
        id?: string | undefined;
    } & {
        title: string;
        grid: Readonly<{} & {
            y: number;
        }>;
        panels: Readonly<{
            id?: string | undefined;
        } & {
            config: Readonly<{} & {}>;
            type: string;
            grid: Readonly<{} & {
                y: number;
                w: number;
                h: number;
                x: number;
            }>;
        }>[];
        collapsed: boolean;
    }>)[]>;
    project_routing: Type<string | undefined>;
    query: Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    refresh_interval: Type<Readonly<{} & {
        value: number;
        pause: boolean;
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
