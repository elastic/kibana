export declare function getCreateResponseBodySchema(isDashboardAppRequest: boolean): import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    data: import("@kbn/config-schema").ObjectType<{
        pinned_panels: import("@kbn/config-schema").Type<(Readonly<{
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
        description: import("@kbn/config-schema").Type<string | undefined>;
        filters: import("@kbn/config-schema").Type<(Readonly<{
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
        options: import("@kbn/config-schema").ObjectType<{
            auto_apply_filters: import("@kbn/config-schema").Type<boolean>;
            hide_panel_titles: import("@kbn/config-schema").Type<boolean>;
            hide_panel_borders: import("@kbn/config-schema").Type<boolean>;
            use_margins: import("@kbn/config-schema").Type<boolean>;
            sync_colors: import("@kbn/config-schema").Type<boolean>;
            sync_tooltips: import("@kbn/config-schema").Type<boolean>;
            sync_cursor: import("@kbn/config-schema").Type<boolean>;
        }>;
        panels: import("@kbn/config-schema").Type<(Readonly<{
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
        project_routing: import("@kbn/config-schema").Type<string | undefined>;
        query: import("@kbn/config-schema").Type<Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined>;
        refresh_interval: import("@kbn/config-schema").Type<Readonly<{} & {
            pause: boolean;
            value: number;
        }> | undefined>;
        tags: import("@kbn/config-schema").Type<string[] | undefined>;
        time_range: import("@kbn/config-schema").Type<Readonly<{
            mode?: "relative" | "absolute" | undefined;
        } & {
            from: string;
            to: string;
        }> | undefined>;
        title: import("@kbn/config-schema").Type<string>;
        access_control: import("@kbn/config-schema").Type<Readonly<{
            access_mode?: "default" | "write_restricted" | undefined;
        } & {}> | undefined>;
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
