import type { DeleteResult } from '@kbn/content-management-plugin/common';
import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
import type { SavedObjectsResolveResponse } from '@kbn/core/server';
import type { DashboardSearchRequestParams, DashboardState } from '../../server';
import type { DashboardReadResponseBody } from '../../server';
export type ReadBodyWithResolve = DashboardReadResponseBody & {
    resolve: {
        outcome: SavedObjectsResolveResponse['outcome'] | undefined;
        aliasTargetId: SavedObjectsResolveResponse['alias_target_id'];
        aliasPurpose: SavedObjectsResolveResponse['alias_purpose'];
    };
};
export declare const dashboardClient: {
    create: (dashboardState: DashboardState, accessMode?: SavedObjectAccessControl["accessMode"]) => Promise<Readonly<{} & {
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
            time_range?: Readonly<{
                mode?: "absolute" | "relative" | undefined;
            } & {
                from: string;
                to: string;
            }> | undefined;
            project_routing?: string | undefined;
            tags?: string[] | undefined;
            refresh_interval?: Readonly<{} & {
                pause: boolean;
                value: number;
            }> | undefined;
            access_control?: Readonly<{
                access_mode?: "default" | "write_restricted" | undefined;
            } & {}> | undefined;
            esql_approximation?: boolean | undefined;
        } & {
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
                title: string;
                grid: Readonly<{} & {
                    y: number;
                }>;
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
                collapsed: boolean;
            }>)[];
            options: Readonly<{} & {
                auto_apply_filters: boolean;
                hide_panel_titles: boolean;
                hide_panel_borders: boolean;
                use_margins: boolean;
                sync_colors: boolean;
                sync_tooltips: boolean;
                sync_cursor: boolean;
            }>;
            pinned_panels: (Readonly<{
                id?: string | undefined;
            } & {
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
            }> | Readonly<{
                id?: string | undefined;
            } & {
                type: "options_list_control";
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
                    sort: Readonly<{} & {
                        direction: "asc" | "desc";
                        by: "_count" | "_key";
                    }>;
                    selected_options: (string | number)[];
                    single_select: boolean;
                    esql_query: string;
                    exclude: boolean;
                    exists_selected: boolean;
                    run_past_timeout: boolean;
                    search_technique: "prefix" | "wildcard" | "exact";
                    values_source: import("@kbn/controls-constants").ControlValuesSource.ESQL;
                    use_global_filters: boolean;
                    ignore_validations: boolean;
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
                    sort: Readonly<{} & {
                        direction: "asc" | "desc";
                        by: "_count" | "_key";
                    }>;
                    selected_options: (string | number)[];
                    single_select: boolean;
                    exclude: boolean;
                    exists_selected: boolean;
                    run_past_timeout: boolean;
                    search_technique: "prefix" | "wildcard" | "exact";
                    values_source: import("@kbn/controls-constants").ControlValuesSource.FIELD;
                    use_global_filters: boolean;
                    ignore_validations: boolean;
                    data_view_id: string;
                    field_name: string;
                }>;
            }> | Readonly<{
                id?: string | undefined;
            } & {
                type: "range_slider_control";
                width: "small" | "large" | "medium";
                grow: boolean;
                config: Readonly<{
                    value?: string[] | undefined;
                    title?: string | undefined;
                } & {
                    step: number;
                    esql_query: string;
                    values_source: import("@kbn/controls-constants").ControlValuesSource.ESQL;
                    use_global_filters: boolean;
                    ignore_validations: boolean;
                }> | Readonly<{
                    value?: string[] | undefined;
                    title?: string | undefined;
                } & {
                    step: number;
                    values_source: import("@kbn/controls-constants").ControlValuesSource.FIELD;
                    use_global_filters: boolean;
                    ignore_validations: boolean;
                    data_view_id: string;
                    field_name: string;
                }>;
            }> | Readonly<{
                id?: string | undefined;
            } & {
                type: "time_slider_control";
                width: "small" | "large" | "medium";
                grow: boolean;
                config: Readonly<{} & {
                    start_percentage_of_time_range: number;
                    end_percentage_of_time_range: number;
                    is_anchored: boolean;
                }>;
            }>)[];
        }>;
    }>>;
    delete: (id: string) => Promise<DeleteResult>;
    get: (id: string) => Promise<ReadBodyWithResolve>;
    search: (searchParams: Partial<DashboardSearchRequestParams>) => Promise<Readonly<{} & {
        meta: Readonly<{} & {
            page: number;
            total: number;
            per_page: number;
        }>;
        data: Readonly<{} & {
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
                time_range?: Readonly<{
                    mode?: "absolute" | "relative" | undefined;
                } & {
                    from: string;
                    to: string;
                }> | undefined;
                tags?: string[] | undefined;
                access_control?: Readonly<{
                    access_mode?: "default" | "write_restricted" | undefined;
                } & {}> | undefined;
            } & {
                title: string;
            }>;
        }>[];
    }>>;
    update: (id: string, dashboardState: DashboardState) => Promise<Readonly<{} & {
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
            time_range?: Readonly<{
                mode?: "absolute" | "relative" | undefined;
            } & {
                from: string;
                to: string;
            }> | undefined;
            project_routing?: string | undefined;
            tags?: string[] | undefined;
            refresh_interval?: Readonly<{} & {
                pause: boolean;
                value: number;
            }> | undefined;
            access_control?: Readonly<{
                access_mode?: "default" | "write_restricted" | undefined;
            } & {}> | undefined;
            esql_approximation?: boolean | undefined;
        } & {
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
                title: string;
                grid: Readonly<{} & {
                    y: number;
                }>;
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
                collapsed: boolean;
            }>)[];
            options: Readonly<{} & {
                auto_apply_filters: boolean;
                hide_panel_titles: boolean;
                hide_panel_borders: boolean;
                use_margins: boolean;
                sync_colors: boolean;
                sync_tooltips: boolean;
                sync_cursor: boolean;
            }>;
            pinned_panels: (Readonly<{
                id?: string | undefined;
            } & {
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
            }> | Readonly<{
                id?: string | undefined;
            } & {
                type: "options_list_control";
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
                    sort: Readonly<{} & {
                        direction: "asc" | "desc";
                        by: "_count" | "_key";
                    }>;
                    selected_options: (string | number)[];
                    single_select: boolean;
                    esql_query: string;
                    exclude: boolean;
                    exists_selected: boolean;
                    run_past_timeout: boolean;
                    search_technique: "prefix" | "wildcard" | "exact";
                    values_source: import("@kbn/controls-constants").ControlValuesSource.ESQL;
                    use_global_filters: boolean;
                    ignore_validations: boolean;
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
                    sort: Readonly<{} & {
                        direction: "asc" | "desc";
                        by: "_count" | "_key";
                    }>;
                    selected_options: (string | number)[];
                    single_select: boolean;
                    exclude: boolean;
                    exists_selected: boolean;
                    run_past_timeout: boolean;
                    search_technique: "prefix" | "wildcard" | "exact";
                    values_source: import("@kbn/controls-constants").ControlValuesSource.FIELD;
                    use_global_filters: boolean;
                    ignore_validations: boolean;
                    data_view_id: string;
                    field_name: string;
                }>;
            }> | Readonly<{
                id?: string | undefined;
            } & {
                type: "range_slider_control";
                width: "small" | "large" | "medium";
                grow: boolean;
                config: Readonly<{
                    value?: string[] | undefined;
                    title?: string | undefined;
                } & {
                    step: number;
                    esql_query: string;
                    values_source: import("@kbn/controls-constants").ControlValuesSource.ESQL;
                    use_global_filters: boolean;
                    ignore_validations: boolean;
                }> | Readonly<{
                    value?: string[] | undefined;
                    title?: string | undefined;
                } & {
                    step: number;
                    values_source: import("@kbn/controls-constants").ControlValuesSource.FIELD;
                    use_global_filters: boolean;
                    ignore_validations: boolean;
                    data_view_id: string;
                    field_name: string;
                }>;
            }> | Readonly<{
                id?: string | undefined;
            } & {
                type: "time_slider_control";
                width: "small" | "large" | "medium";
                grow: boolean;
                config: Readonly<{} & {
                    start_percentage_of_time_range: number;
                    end_percentage_of_time_range: number;
                    is_anchored: boolean;
                }>;
            }>)[];
        }>;
    }>>;
    invalidateCache: (id: string) => Promise<void>;
};
