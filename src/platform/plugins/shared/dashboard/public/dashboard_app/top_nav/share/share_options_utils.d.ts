import type { LocatorPublic } from '@kbn/share-plugin/common';
import { type DashboardLocatorParams } from '../../../../common';
import type { DashboardApi } from '../../../dashboard_api/types';
/**
 * Builds common share options used by both the share modal and export items.
 */
export declare function buildDashboardShareOptions({ objectId, dashboardTitle, }: {
    objectId?: string;
    dashboardTitle?: string;
}): {
    locatorParams: DashboardLocatorParams;
    shareableUrl: string;
    allowShortUrl: boolean;
    title: string;
    hasPanelChanges: boolean;
};
/**
 * Returns the objectTypeMeta config for export integrations.
 */
export declare function getExportObjectTypeMeta(): {
    title: string;
    config: {
        integration: {
            export: {
                exportJson: {};
                pdfReports: {
                    draftModeCallOut: boolean;
                };
                imageReports: {
                    draftModeCallOut: boolean;
                };
            };
        };
    };
};
/**
 * Builds sharingData for export operations.
 */
export declare function buildExportSharingData(title: string, locatorParams: DashboardLocatorParams, dashboardApi: DashboardApi): {
    title: string;
    locatorParams: {
        id: string;
        params: Partial<Omit<import("@kbn/utility-types").Writable<Readonly<{
            query?: Readonly<{} & {
                expression: string;
                language: "lucene" | "kql";
            }> | undefined;
            description?: string | undefined;
            tags?: string[] | undefined;
            filters?: (Readonly<{
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
            }>)[] | undefined;
            project_routing?: string | undefined;
            refresh_interval?: Readonly<{} & {
                pause: boolean;
                value: number;
            }> | undefined;
            time_range?: Readonly<{
                mode?: "relative" | "absolute" | undefined;
            } & {
                from: string;
                to: string;
            }> | undefined;
            access_control?: Readonly<{
                access_mode?: "default" | "write_restricted" | undefined;
            } & {}> | undefined;
        } & {
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
            }>)[];
            pinned_panels: (Readonly<{
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
            }>)[];
        }>>, "query" | "filters"> & {
            filters?: import("@kbn/es-query").Filter[];
            query?: import("@kbn/data-plugin/common").Query;
            viewMode?: import("@kbn/presentation-publishing").ViewMode;
            dashboardId?: string;
            useHash?: boolean;
            preserveSavedFilters?: boolean;
            searchSessionId?: string;
        }>;
    };
    exportJson: () => import("@kbn/utility-types").Writable<Readonly<{
        query?: Readonly<{} & {
            expression: string;
            language: "lucene" | "kql";
        }> | undefined;
        description?: string | undefined;
        tags?: string[] | undefined;
        filters?: (Readonly<{
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
        }>)[] | undefined;
        project_routing?: string | undefined;
        refresh_interval?: Readonly<{} & {
            pause: boolean;
            value: number;
        }> | undefined;
        time_range?: Readonly<{
            mode?: "relative" | "absolute" | undefined;
        } & {
            from: string;
            to: string;
        }> | undefined;
        access_control?: Readonly<{
            access_mode?: "default" | "write_restricted" | undefined;
        } & {}> | undefined;
    } & {
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
        }>)[];
        pinned_panels: (Readonly<{
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
        }>)[];
    }>>;
};
/**
 * Builds shareableUrlLocatorParams for export operations.
 */
export declare function buildShareableUrlLocatorParams(locatorParams: DashboardLocatorParams): {
    locator: LocatorPublic<DashboardLocatorParams>;
    params: {
        timeRange: Readonly<{
            mode?: "relative" | "absolute" | undefined;
        } & {
            from: string;
            to: string;
        }> | undefined;
        options?: Readonly<{} & {
            auto_apply_filters: boolean;
            hide_panel_titles: boolean;
            hide_panel_borders: boolean;
            use_margins: boolean;
            sync_colors: boolean;
            sync_tooltips: boolean;
            sync_cursor: boolean;
        }> | undefined;
        title?: string | undefined;
        description?: string | undefined;
        tags?: string[] | undefined;
        project_routing?: string | undefined;
        panels?: (Readonly<{
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
        }>)[] | undefined;
        pinned_panels?: (Readonly<{
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
        }>)[] | undefined;
        refresh_interval?: Readonly<{} & {
            pause: boolean;
            value: number;
        }> | undefined;
        time_range?: Readonly<{
            mode?: "relative" | "absolute" | undefined;
        } & {
            from: string;
            to: string;
        }> | undefined;
        access_control?: Readonly<{
            access_mode?: "default" | "write_restricted" | undefined;
        } & {}> | undefined;
        filters?: import("@kbn/es-query").Filter[] | undefined;
        query?: import("@kbn/data-plugin/common").Query | undefined;
        viewMode?: import("@kbn/presentation-publishing").ViewMode | undefined;
        dashboardId?: string | undefined;
        useHash?: boolean | undefined;
        preserveSavedFilters?: boolean | undefined;
        searchSessionId?: string | undefined;
    };
};
export declare const mapExportIntegrationToMetaData: (intgrationId: string) => {
    label: string;
    testId: string;
    iconType: string;
    order: number;
    separator?: undefined;
} | {
    label: string;
    testId: string;
    iconType: string;
    order: number;
    separator: "above";
} | {
    label: string;
    iconType: undefined;
    testId: string;
    order: number;
    separator?: undefined;
};
