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
        y: number;
        w: number;
        h: number;
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
            y: number;
            w: number;
            h: number;
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
        grow: boolean;
        width: "medium" | "small" | "large";
    }> | Readonly<{
        id?: string | undefined;
    } & {
        type: "options_list_control";
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
                direction: "asc" | "desc";
                by: "_count" | "_key";
            }>;
            exclude: boolean;
            selected_options: (string | number)[];
            single_select: boolean;
            exists_selected: boolean;
            run_past_timeout: boolean;
            search_technique: "exact" | "wildcard" | "prefix";
            data_view_id: string;
            field_name: string;
            use_global_filters: boolean;
            ignore_validations: boolean;
        }>;
        grow: boolean;
        width: "medium" | "small" | "large";
    }> | Readonly<{
        id?: string | undefined;
    } & {
        type: "range_slider_control";
        config: Readonly<{
            value?: string[] | undefined;
            title?: string | undefined;
        } & {
            step: number;
            data_view_id: string;
            field_name: string;
            use_global_filters: boolean;
            ignore_validations: boolean;
        }>;
        grow: boolean;
        width: "medium" | "small" | "large";
    }> | Readonly<{
        id?: string | undefined;
    } & {
        type: "time_slider_control";
        config: Readonly<{} & {
            start_percentage_of_time_range: number;
            end_percentage_of_time_range: number;
            is_anchored: boolean;
        }>;
        grow: boolean;
        width: "medium" | "small" | "large";
    }>)[]>;
    description: Type<string | undefined>;
    filters: Type<(Readonly<{
        label?: string | undefined;
        disabled?: boolean | undefined;
        data_view_id?: string | undefined;
        negate?: boolean | undefined;
        controlled_by?: string | undefined;
        is_multi_index?: boolean | undefined;
    } & {
        type: "condition";
        condition: Readonly<{
            negate?: boolean | undefined;
        } & {
            value: string | number | boolean;
            field: string;
            operator: "is";
        }> | Readonly<{
            negate?: boolean | undefined;
        } & {
            value: string[] | number[] | boolean[];
            field: string;
            operator: "is_one_of";
        }> | Readonly<{
            negate?: boolean | undefined;
        } & {
            value: Readonly<{
                format?: string | undefined;
                gte?: string | number | undefined;
                lt?: string | number | undefined;
                lte?: string | number | undefined;
                gt?: string | number | undefined;
            } & {}>;
            field: string;
            operator: "range";
        }> | Readonly<{
            negate?: boolean | undefined;
        } & {
            field: string;
            operator: "exists";
        }>;
    }> | Readonly<{
        label?: string | undefined;
        disabled?: boolean | undefined;
        data_view_id?: string | undefined;
        negate?: boolean | undefined;
        controlled_by?: string | undefined;
        is_multi_index?: boolean | undefined;
    } & {
        type: "group";
        group: Readonly<{} & {
            operator: "or" | "and";
            conditions: (Readonly<{
                negate?: boolean | undefined;
            } & {
                value: string | number | boolean;
                field: string;
                operator: "is";
            }> | Readonly<{
                negate?: boolean | undefined;
            } & {
                value: string[] | number[] | boolean[];
                field: string;
                operator: "is_one_of";
            }> | Readonly<{
                negate?: boolean | undefined;
            } & {
                value: Readonly<{
                    format?: string | undefined;
                    gte?: string | number | undefined;
                    lt?: string | number | undefined;
                    lte?: string | number | undefined;
                    gt?: string | number | undefined;
                } & {}>;
                field: string;
                operator: "range";
            }> | Readonly<{
                negate?: boolean | undefined;
            } & {
                field: string;
                operator: "exists";
            }> | import("@kbn/as-code-filters-schema").AsCodeGroupFilterRecursive)[];
        }>;
    }> | Readonly<{
        params?: any;
        label?: string | undefined;
        disabled?: boolean | undefined;
        field?: string | undefined;
        data_view_id?: string | undefined;
        negate?: boolean | undefined;
        controlled_by?: string | undefined;
        is_multi_index?: boolean | undefined;
    } & {
        type: "dsl";
        dsl: Record<string, any>;
    }> | Readonly<{
        label?: string | undefined;
        disabled?: boolean | undefined;
        data_view_id?: string | undefined;
        negate?: boolean | undefined;
        controlled_by?: string | undefined;
        is_multi_index?: boolean | undefined;
    } & {
        type: "spatial";
        dsl: Record<string, any>;
    }>)[] | undefined>;
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
            y: number;
            w: number;
            h: number;
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
        collapsed: boolean;
        panels: Readonly<{
            id?: string | undefined;
        } & {
            type: string;
            grid: Readonly<{} & {
                y: number;
                w: number;
                h: number;
                x: number;
            }>;
            config: Readonly<{} & {}>;
        }>[];
    }>)[]>;
    project_routing: Type<string | undefined>;
    query: Type<Readonly<{} & {
        expression: string;
        language: "lucene" | "kql";
    }> | undefined>;
    refresh_interval: Type<Readonly<{} & {
        pause: boolean;
        value: number;
    }> | undefined>;
    tags: Type<string[] | undefined>;
    time_range: Type<Readonly<{
        mode?: "relative" | "absolute" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined>;
    title: Type<string>;
    access_control: Type<Readonly<{
        access_mode?: "default" | "write_restricted" | undefined;
    } & {}> | undefined>;
}>;
