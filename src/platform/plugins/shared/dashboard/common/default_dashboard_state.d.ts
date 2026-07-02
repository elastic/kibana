import type { DashboardState } from '.';
import type { DashboardReadResponseBody } from '../server';
export declare const DEFAULT_DASHBOARD_STATE: DashboardState;
export declare function getLastSavedState(readResult?: DashboardReadResponseBody): {
    query?: Readonly<{} & {
        language: "kql" | "lucene";
        expression: string;
    }> | undefined;
    description?: string | undefined;
    tags?: string[] | undefined;
    filters?: (Readonly<{
        disabled?: boolean | undefined;
        label?: string | undefined;
        negate?: boolean | undefined;
        data_view_id?: string | undefined;
        controlled_by?: string | undefined;
        is_multi_index?: boolean | undefined;
    } & {
        type: "condition";
        condition: Readonly<{
            negate?: boolean | undefined;
        } & {
            value: string | number | boolean;
            operator: "is";
            field: string;
        }> | Readonly<{
            negate?: boolean | undefined;
        } & {
            value: string[] | number[] | boolean[];
            operator: "is_one_of";
            field: string;
        }> | Readonly<{
            negate?: boolean | undefined;
        } & {
            value: Readonly<{
                format?: string | undefined;
                gte?: string | number | undefined;
                lte?: string | number | undefined;
                lt?: string | number | undefined;
                gt?: string | number | undefined;
            } & {}>;
            operator: "range";
            field: string;
        }> | Readonly<{
            negate?: boolean | undefined;
        } & {
            operator: "exists";
            field: string;
        }>;
    }> | Readonly<{
        disabled?: boolean | undefined;
        label?: string | undefined;
        negate?: boolean | undefined;
        data_view_id?: string | undefined;
        controlled_by?: string | undefined;
        is_multi_index?: boolean | undefined;
    } & {
        type: "group";
        group: Readonly<{} & {
            operator: "and" | "or";
            conditions: (Readonly<{
                negate?: boolean | undefined;
            } & {
                value: string | number | boolean;
                operator: "is";
                field: string;
            }> | Readonly<{
                negate?: boolean | undefined;
            } & {
                value: string[] | number[] | boolean[];
                operator: "is_one_of";
                field: string;
            }> | Readonly<{
                negate?: boolean | undefined;
            } & {
                value: Readonly<{
                    format?: string | undefined;
                    gte?: string | number | undefined;
                    lte?: string | number | undefined;
                    lt?: string | number | undefined;
                    gt?: string | number | undefined;
                } & {}>;
                operator: "range";
                field: string;
            }> | Readonly<{
                negate?: boolean | undefined;
            } & {
                operator: "exists";
                field: string;
            }> | import("@kbn/as-code-filters-schema").AsCodeGroupFilterRecursive)[];
        }>;
    }> | Readonly<{
        disabled?: boolean | undefined;
        label?: string | undefined;
        field?: string | undefined;
        params?: any;
        negate?: boolean | undefined;
        data_view_id?: string | undefined;
        controlled_by?: string | undefined;
        is_multi_index?: boolean | undefined;
    } & {
        type: "dsl";
        dsl: Record<string, any>;
    }> | Readonly<{
        disabled?: boolean | undefined;
        label?: string | undefined;
        negate?: boolean | undefined;
        data_view_id?: string | undefined;
        controlled_by?: string | undefined;
        is_multi_index?: boolean | undefined;
    } & {
        type: "spatial";
        dsl: Record<string, any>;
    }>)[] | undefined;
    time_range?: Readonly<{
        mode?: "relative" | "absolute" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
    project_routing?: string | undefined;
    refresh_interval?: Readonly<{} & {
        pause: boolean;
        value: number;
    }> | undefined;
    access_control?: Readonly<{
        access_mode?: "default" | "write_restricted" | undefined;
    } & {}> | undefined;
    options: Readonly<{} & {
        auto_apply_filters: boolean;
        hide_panel_titles: boolean;
        hide_panel_borders: boolean;
        use_margins: boolean;
        sync_colors: boolean;
        sync_tooltips: boolean;
        sync_cursor: boolean;
    }>;
    title: string;
    panels: (Readonly<{
        id?: string | undefined;
        version?: string | undefined;
    } & {
        type: string;
        grid: Readonly<{} & {
            x: number;
            y: number;
            w: number;
            h: number;
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
            version?: string | undefined;
        } & {
            type: string;
            grid: Readonly<{} & {
                x: number;
                y: number;
                w: number;
                h: number;
            }>;
            config: Readonly<{} & {}>;
        }>[];
    }>)[];
    pinned_panels: (Readonly<{
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
                by: "_key" | "_count";
                direction: "desc" | "asc";
            }>;
            field_name: string;
            exclude: boolean;
            selected_options: (string | number)[];
            single_select: boolean;
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
    }>)[];
};
