import type { SavedObject, SavedObjectsUpdateResponse } from '@kbn/core-saved-objects-api-server';
import type { RequestTiming } from '@kbn/core-http-server';
import type { DashboardSavedObjectAttributes } from '../dashboard_saved_object';
import type { Operation } from './types';
import type { getDashboardStateSchema } from './dashboard_state_schemas';
export declare function getDashboardCRUResponseBody(savedObject: SavedObject<DashboardSavedObjectAttributes> | SavedObjectsUpdateResponse<DashboardSavedObjectAttributes>, operation: Operation, dashboardStateSchema: ReturnType<typeof getDashboardStateSchema>, isDashboardAppRequest?: boolean, serverTiming?: RequestTiming): {
    warnings?: Readonly<{
        panel_references?: Readonly<{} & {
            type: string;
            id: string;
            name: string;
        }>[] | undefined;
    } & {
        type: "dropped_panel";
        message: string;
        panel_type: string;
        panel_config: Readonly<{} & {}>;
    }>[] | undefined;
    id: string;
    data: {
        access_control?: Readonly<{
            access_mode?: "default" | "write_restricted" | undefined;
        } & {}> | undefined;
        query?: Readonly<{} & {
            expression: string;
            language: "kql" | "lucene";
        }> | undefined;
        description?: string | undefined;
        tags?: string[] | undefined;
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
        project_routing?: string | undefined;
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
        title: string;
        options: Readonly<{} & {
            auto_apply_filters: boolean;
            hide_panel_titles: boolean;
            hide_panel_borders: boolean;
            use_margins: boolean;
            sync_colors: boolean;
            sync_tooltips: boolean;
            sync_cursor: boolean;
        }>;
        panels: (Readonly<{
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
        }>)[];
    };
    meta: Readonly<{
        managed?: boolean | undefined;
        version?: string | undefined;
        updated_at?: string | undefined;
        updated_by?: string | undefined;
        created_at?: string | undefined;
        created_by?: string | undefined;
        owner?: string | undefined;
    } & {}>;
};
