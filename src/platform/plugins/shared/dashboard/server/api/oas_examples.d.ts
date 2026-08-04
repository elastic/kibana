import { ControlValuesSource } from '@kbn/controls-constants';
export declare const createDashboardOASOperationObject: {
    description: string;
    'x-codeSamples': {
        lang: string;
        label: string;
        source: string;
    }[];
    requestBody: {
        content: {
            'application/json': {
                examples: {
                    createDashboard: {
                        summary: string;
                        value: {
                            title: string;
                            panels: ({
                                grid: {
                                    x: number;
                                    y: number;
                                    w: number;
                                    h: number;
                                };
                                type: string;
                                config: {
                                    content: string;
                                    type?: undefined;
                                    data_source?: undefined;
                                    metrics?: undefined;
                                    title?: undefined;
                                    layers?: undefined;
                                    axis?: undefined;
                                };
                            } | {
                                grid: {
                                    x: number;
                                    y: number;
                                    w: number;
                                    h: number;
                                };
                                type: string;
                                config: {
                                    type: string;
                                    data_source: {
                                        type: string;
                                        index_pattern: string;
                                        time_field: string;
                                    };
                                    metrics: {
                                        type: string;
                                        operation: string;
                                    }[];
                                    content?: undefined;
                                    title?: undefined;
                                    layers?: undefined;
                                    axis?: undefined;
                                };
                            } | {
                                grid: {
                                    x: number;
                                    y: number;
                                    w: number;
                                    h: number;
                                };
                                type: string;
                                config: {
                                    type: string;
                                    data_source: {
                                        type: string;
                                        index_pattern: string;
                                        time_field: string;
                                    };
                                    metrics: {
                                        type: string;
                                        operation: string;
                                        field: string;
                                    }[];
                                    content?: undefined;
                                    title?: undefined;
                                    layers?: undefined;
                                    axis?: undefined;
                                };
                            } | {
                                grid: {
                                    x: number;
                                    y: number;
                                    w: number;
                                    h: number;
                                };
                                type: string;
                                config: {
                                    type: string;
                                    title: string;
                                    layers: {
                                        type: string;
                                        data_source: {
                                            type: string;
                                            query: string;
                                        };
                                        x: {
                                            column: string;
                                        };
                                        y: {
                                            column: string;
                                        }[];
                                    }[];
                                    axis: {
                                        x: {
                                            title: {
                                                visible: boolean;
                                            };
                                        };
                                    };
                                    content?: undefined;
                                    data_source?: undefined;
                                    metrics?: undefined;
                                };
                            })[];
                        };
                    };
                    createDashboardWithSectionsAndControls: {
                        summary: string;
                        value: {
                            title: string;
                            time_range: {
                                from: string;
                                to: string;
                            };
                            pinned_panels: {
                                type: "options_list_control";
                                width: "medium";
                                grow: true;
                                config: {
                                    title: string;
                                    data_view_id: string;
                                    field_name: string;
                                    values_source: ControlValuesSource.FIELD;
                                    use_global_filters: true;
                                    ignore_validations: false;
                                    exclude: false;
                                    exists_selected: false;
                                    run_past_timeout: false;
                                    search_technique: "prefix";
                                    selected_options: never[];
                                    single_select: false;
                                    sort: {
                                        by: "_count";
                                        direction: "desc";
                                    };
                                };
                            }[];
                            panels: ({
                                title: string;
                                collapsed: false;
                                grid: {
                                    y: number;
                                };
                                panels: ({
                                    grid: {
                                        x: number;
                                        y: number;
                                        w: number;
                                        h: number;
                                    };
                                    type: string;
                                    config: {
                                        type: string;
                                        data_source: {
                                            type: string;
                                            index_pattern: string;
                                            time_field: string;
                                        };
                                        metrics: {
                                            type: string;
                                            operation: string;
                                        }[];
                                    };
                                } | {
                                    grid: {
                                        x: number;
                                        y: number;
                                        w: number;
                                        h: number;
                                    };
                                    type: string;
                                    config: {
                                        type: string;
                                        data_source: {
                                            type: string;
                                            index_pattern: string;
                                            time_field: string;
                                        };
                                        metrics: {
                                            type: string;
                                            operation: string;
                                            field: string;
                                        }[];
                                    };
                                })[];
                            } | {
                                title: string;
                                collapsed: false;
                                grid: {
                                    y: number;
                                };
                                panels: ({
                                    grid: {
                                        x: number;
                                        y: number;
                                        w: number;
                                        h: number;
                                    };
                                    type: string;
                                    config: {
                                        type: string;
                                        title: string;
                                        layers: {
                                            type: string;
                                            data_source: {
                                                type: string;
                                                index_pattern: string;
                                                time_field: string;
                                            };
                                            x: {
                                                operation: string;
                                                field: string;
                                            };
                                            y: {
                                                operation: string;
                                            }[];
                                        }[];
                                        axis: {
                                            x: {
                                                title: {
                                                    visible: boolean;
                                                };
                                            };
                                        };
                                    };
                                } | {
                                    grid: {
                                        x: number;
                                        y: number;
                                        w: number;
                                        h: number;
                                    };
                                    type: string;
                                    config: {
                                        type: string;
                                        title: string;
                                        layers: {
                                            type: string;
                                            data_source: {
                                                type: string;
                                                query: string;
                                            };
                                            x: {
                                                column: string;
                                            };
                                            y: {
                                                column: string;
                                            }[];
                                        }[];
                                        axis: {
                                            x: {
                                                title: {
                                                    visible: boolean;
                                                };
                                            };
                                        };
                                    };
                                })[];
                            })[];
                        };
                    };
                };
            };
        };
    };
    responses: {
        201: {
            content: {
                'application/json': {
                    examples: {
                        createDashboardResponse: {
                            summary: string;
                            description: string;
                            value: {
                                id: string;
                                data: {
                                    options: {
                                        hide_panel_titles: false;
                                        hide_panel_borders: false;
                                        use_margins: true;
                                        auto_apply_filters: true;
                                        sync_colors: false;
                                        sync_cursor: true;
                                        sync_tooltips: false;
                                    };
                                    panels: ({
                                        grid: {
                                            x: number;
                                            y: number;
                                            w: number;
                                            h: number;
                                        };
                                        config: {
                                            content: string;
                                            title?: undefined;
                                            data_source?: undefined;
                                            type?: undefined;
                                            sampling?: undefined;
                                            ignore_global_filters?: undefined;
                                            metrics?: undefined;
                                            styling?: undefined;
                                            layers?: undefined;
                                            axis?: undefined;
                                            legend?: undefined;
                                        };
                                        id: string;
                                        type: string;
                                    } | {
                                        grid: {
                                            x: number;
                                            y: number;
                                            w: number;
                                            h: number;
                                        };
                                        config: {
                                            title: string;
                                            data_source: {
                                                type: string;
                                                index_pattern: string;
                                                time_field: string;
                                            };
                                            type: string;
                                            sampling: number;
                                            ignore_global_filters: boolean;
                                            metrics: {
                                                type: string;
                                                operation: string;
                                                empty_as_null: boolean;
                                            }[];
                                            styling: {
                                                primary: {
                                                    position: string;
                                                    labels: {
                                                        alignment: string;
                                                    };
                                                    value: {
                                                        sizing: string;
                                                        alignment: string;
                                                    };
                                                };
                                                overlays?: undefined;
                                                interpolation?: undefined;
                                                points?: undefined;
                                            };
                                            content?: undefined;
                                            layers?: undefined;
                                            axis?: undefined;
                                            legend?: undefined;
                                        };
                                        id: string;
                                        type: string;
                                    } | {
                                        grid: {
                                            x: number;
                                            y: number;
                                            w: number;
                                            h: number;
                                        };
                                        config: {
                                            title: string;
                                            data_source: {
                                                type: string;
                                                index_pattern: string;
                                                time_field: string;
                                            };
                                            type: string;
                                            sampling: number;
                                            ignore_global_filters: boolean;
                                            metrics: {
                                                type: string;
                                                operation: string;
                                                field: string;
                                            }[];
                                            styling: {
                                                primary: {
                                                    position: string;
                                                    labels: {
                                                        alignment: string;
                                                    };
                                                    value: {
                                                        sizing: string;
                                                        alignment: string;
                                                    };
                                                };
                                                overlays?: undefined;
                                                interpolation?: undefined;
                                                points?: undefined;
                                            };
                                            content?: undefined;
                                            layers?: undefined;
                                            axis?: undefined;
                                            legend?: undefined;
                                        };
                                        id: string;
                                        type: string;
                                    } | {
                                        grid: {
                                            x: number;
                                            y: number;
                                            w: number;
                                            h: number;
                                        };
                                        config: {
                                            title: string;
                                            type: string;
                                            layers: {
                                                type: string;
                                                data_source: {
                                                    type: string;
                                                    query: string;
                                                };
                                                sampling: number;
                                                ignore_global_filters: boolean;
                                                x: {
                                                    column: string;
                                                };
                                                y: {
                                                    column: string;
                                                    axis_id: string;
                                                }[];
                                            }[];
                                            axis: {
                                                x: {
                                                    title: {
                                                        visible: boolean;
                                                    };
                                                    ticks: {
                                                        visible: boolean;
                                                    };
                                                    grid: {
                                                        visible: boolean;
                                                    };
                                                    domain: {
                                                        type: string;
                                                        rounding: boolean;
                                                    };
                                                    labels: {
                                                        orientation: string;
                                                    };
                                                    scale: string;
                                                };
                                                y: {
                                                    anchor: string;
                                                    title: {
                                                        visible: boolean;
                                                    };
                                                    scale: string;
                                                    ticks: {
                                                        visible: boolean;
                                                    };
                                                    grid: {
                                                        visible: boolean;
                                                    };
                                                    domain: {
                                                        type: string;
                                                        rounding: boolean;
                                                    };
                                                    labels: {
                                                        orientation: string;
                                                    };
                                                };
                                            };
                                            styling: {
                                                overlays: {
                                                    partial_buckets: {
                                                        visible: boolean;
                                                    };
                                                    current_time_marker: {
                                                        visible: boolean;
                                                    };
                                                };
                                                interpolation: string;
                                                points: {
                                                    visibility: string;
                                                };
                                                primary?: undefined;
                                            };
                                            legend: {
                                                visibility: string;
                                                placement: string;
                                                position: string;
                                                layout: {
                                                    type: string;
                                                    truncate: {
                                                        max_lines: number;
                                                    };
                                                };
                                            };
                                            content?: undefined;
                                            data_source?: undefined;
                                            sampling?: undefined;
                                            ignore_global_filters?: undefined;
                                            metrics?: undefined;
                                        };
                                        id: string;
                                        type: string;
                                    })[];
                                    pinned_panels: never[];
                                    access_control: {
                                        access_mode: "write_restricted";
                                    };
                                    title: string;
                                };
                                meta: {
                                    created_at: string;
                                    managed: false;
                                    updated_at: string;
                                    version: string;
                                };
                            };
                        };
                    };
                };
            };
        };
    };
};
export declare const searchDashboardOASOperationObject: {
    'x-codeSamples': {
        lang: string;
        label: string;
        source: string;
    }[];
    responses: {
        200: {
            content: {
                'application/json': {
                    examples: {
                        searchDashboardsResponse: {
                            summary: string;
                            description: string;
                            value: {
                                data: ({
                                    id: string;
                                    data: {
                                        title: string;
                                        time_range?: undefined;
                                    };
                                    meta: {
                                        created_at: string;
                                        managed: false;
                                        updated_at: string;
                                        version: string;
                                    };
                                } | {
                                    id: string;
                                    data: {
                                        time_range: {
                                            from: string;
                                            to: string;
                                        };
                                        title: string;
                                    };
                                    meta: {
                                        created_at: string;
                                        managed: false;
                                        updated_at: string;
                                        version: string;
                                    };
                                })[];
                                meta: {
                                    page: number;
                                    per_page: number;
                                    total: number;
                                };
                            };
                        };
                    };
                };
            };
        };
    };
};
export declare const readDashboardOASOperationObject: {
    'x-codeSamples': {
        lang: string;
        label: string;
        source: string;
    }[];
    responses: {
        200: {
            content: {
                'application/json': {
                    examples: {
                        getDashboardResponse: {
                            summary: string;
                            description: string;
                            value: {
                                id: string;
                                data: {
                                    options: {
                                        hide_panel_titles: false;
                                        hide_panel_borders: false;
                                        use_margins: true;
                                        auto_apply_filters: true;
                                        sync_colors: false;
                                        sync_cursor: true;
                                        sync_tooltips: false;
                                    };
                                    title: string;
                                    panels: ({
                                        grid: {
                                            x: number;
                                            y: number;
                                            w: number;
                                            h: number;
                                        };
                                        config: {
                                            title: string;
                                            data_source: {
                                                type: string;
                                                index_pattern: string;
                                                time_field: string;
                                            };
                                            type: string;
                                            sampling: number;
                                            ignore_global_filters: boolean;
                                            metrics: {
                                                type: string;
                                                operation: string;
                                                empty_as_null: boolean;
                                            }[];
                                            styling: {
                                                primary: {
                                                    position: string;
                                                    labels: {
                                                        alignment: string;
                                                    };
                                                    value: {
                                                        sizing: string;
                                                        alignment: string;
                                                    };
                                                };
                                                overlays?: undefined;
                                                interpolation?: undefined;
                                                points?: undefined;
                                            };
                                            layers?: undefined;
                                            axis?: undefined;
                                            legend?: undefined;
                                        };
                                        id: string;
                                        type: string;
                                    } | {
                                        grid: {
                                            x: number;
                                            y: number;
                                            w: number;
                                            h: number;
                                        };
                                        config: {
                                            title: string;
                                            data_source: {
                                                type: string;
                                                index_pattern: string;
                                                time_field: string;
                                            };
                                            type: string;
                                            sampling: number;
                                            ignore_global_filters: boolean;
                                            metrics: {
                                                type: string;
                                                operation: string;
                                                field: string;
                                            }[];
                                            styling: {
                                                primary: {
                                                    position: string;
                                                    labels: {
                                                        alignment: string;
                                                    };
                                                    value: {
                                                        sizing: string;
                                                        alignment: string;
                                                    };
                                                };
                                                overlays?: undefined;
                                                interpolation?: undefined;
                                                points?: undefined;
                                            };
                                            layers?: undefined;
                                            axis?: undefined;
                                            legend?: undefined;
                                        };
                                        id: string;
                                        type: string;
                                    } | {
                                        grid: {
                                            x: number;
                                            y: number;
                                            w: number;
                                            h: number;
                                        };
                                        config: {
                                            title: string;
                                            type: string;
                                            layers: {
                                                type: string;
                                                data_source: {
                                                    type: string;
                                                    query: string;
                                                };
                                                sampling: number;
                                                ignore_global_filters: boolean;
                                                x: {
                                                    column: string;
                                                };
                                                y: {
                                                    column: string;
                                                    axis_id: string;
                                                }[];
                                            }[];
                                            axis: {
                                                x: {
                                                    title: {
                                                        visible: boolean;
                                                    };
                                                    ticks: {
                                                        visible: boolean;
                                                    };
                                                    grid: {
                                                        visible: boolean;
                                                    };
                                                    domain: {
                                                        type: string;
                                                        rounding: boolean;
                                                    };
                                                    labels: {
                                                        orientation: string;
                                                    };
                                                    scale: string;
                                                };
                                                y: {
                                                    anchor: string;
                                                    title: {
                                                        visible: boolean;
                                                    };
                                                    scale: string;
                                                    ticks: {
                                                        visible: boolean;
                                                    };
                                                    grid: {
                                                        visible: boolean;
                                                    };
                                                    domain: {
                                                        type: string;
                                                        rounding: boolean;
                                                    };
                                                    labels: {
                                                        orientation: string;
                                                    };
                                                };
                                            };
                                            styling: {
                                                overlays: {
                                                    partial_buckets: {
                                                        visible: boolean;
                                                    };
                                                    current_time_marker: {
                                                        visible: boolean;
                                                    };
                                                };
                                                interpolation: string;
                                                points: {
                                                    visibility: string;
                                                };
                                                primary?: undefined;
                                            };
                                            legend: {
                                                visibility: string;
                                                placement: string;
                                                position: string;
                                                layout: {
                                                    type: string;
                                                    truncate: {
                                                        max_lines: number;
                                                    };
                                                };
                                            };
                                            data_source?: undefined;
                                            sampling?: undefined;
                                            ignore_global_filters?: undefined;
                                            metrics?: undefined;
                                        };
                                        id: string;
                                        type: string;
                                    })[];
                                    pinned_panels: never[];
                                };
                                meta: {
                                    created_at: string;
                                    managed: false;
                                    updated_at: string;
                                    version: string;
                                };
                            };
                        };
                    };
                };
            };
        };
    };
};
export declare const updateDashboardOASOperationObject: {
    description: string;
    'x-codeSamples': {
        lang: string;
        label: string;
        source: string;
    }[];
    requestBody: {
        content: {
            'application/json': {
                examples: {
                    updateDashboard: {
                        summary: string;
                        value: {
                            title: string;
                            panels: ({
                                grid: {
                                    x: number;
                                    y: number;
                                    w: number;
                                    h: number;
                                };
                                type: string;
                                config: {
                                    type: string;
                                    data_source: {
                                        type: string;
                                        index_pattern: string;
                                        time_field: string;
                                    };
                                    metrics: {
                                        type: string;
                                        operation: string;
                                    }[];
                                    title?: undefined;
                                    layers?: undefined;
                                    axis?: undefined;
                                };
                            } | {
                                grid: {
                                    x: number;
                                    y: number;
                                    w: number;
                                    h: number;
                                };
                                type: string;
                                config: {
                                    type: string;
                                    data_source: {
                                        type: string;
                                        index_pattern: string;
                                        time_field: string;
                                    };
                                    metrics: {
                                        type: string;
                                        operation: string;
                                        field: string;
                                    }[];
                                    title?: undefined;
                                    layers?: undefined;
                                    axis?: undefined;
                                };
                            } | {
                                grid: {
                                    x: number;
                                    y: number;
                                    w: number;
                                    h: number;
                                };
                                type: string;
                                config: {
                                    type: string;
                                    title: string;
                                    layers: {
                                        type: string;
                                        data_source: {
                                            type: string;
                                            query: string;
                                        };
                                        x: {
                                            column: string;
                                        };
                                        y: {
                                            column: string;
                                        }[];
                                    }[];
                                    axis: {
                                        x: {
                                            title: {
                                                visible: boolean;
                                            };
                                        };
                                    };
                                    data_source?: undefined;
                                    metrics?: undefined;
                                };
                            })[];
                        };
                    };
                };
            };
        };
    };
    responses: {
        200: {
            content: {
                'application/json': {
                    examples: {
                        updateDashboardResponse: {
                            summary: string;
                            description: string;
                            value: {
                                id: string;
                                data: {
                                    options: {
                                        hide_panel_titles: false;
                                        hide_panel_borders: false;
                                        use_margins: true;
                                        auto_apply_filters: true;
                                        sync_colors: false;
                                        sync_cursor: true;
                                        sync_tooltips: false;
                                    };
                                    panels: ({
                                        grid: {
                                            x: number;
                                            y: number;
                                            w: number;
                                            h: number;
                                        };
                                        config: {
                                            content: string;
                                            title?: undefined;
                                            data_source?: undefined;
                                            type?: undefined;
                                            sampling?: undefined;
                                            ignore_global_filters?: undefined;
                                            metrics?: undefined;
                                            styling?: undefined;
                                            layers?: undefined;
                                            axis?: undefined;
                                            legend?: undefined;
                                        };
                                        id: string;
                                        type: string;
                                    } | {
                                        grid: {
                                            x: number;
                                            y: number;
                                            w: number;
                                            h: number;
                                        };
                                        config: {
                                            title: string;
                                            data_source: {
                                                type: string;
                                                index_pattern: string;
                                                time_field: string;
                                            };
                                            type: string;
                                            sampling: number;
                                            ignore_global_filters: boolean;
                                            metrics: {
                                                type: string;
                                                operation: string;
                                                empty_as_null: boolean;
                                            }[];
                                            styling: {
                                                primary: {
                                                    position: string;
                                                    labels: {
                                                        alignment: string;
                                                    };
                                                    value: {
                                                        sizing: string;
                                                        alignment: string;
                                                    };
                                                };
                                                overlays?: undefined;
                                                interpolation?: undefined;
                                                points?: undefined;
                                            };
                                            content?: undefined;
                                            layers?: undefined;
                                            axis?: undefined;
                                            legend?: undefined;
                                        };
                                        id: string;
                                        type: string;
                                    } | {
                                        grid: {
                                            x: number;
                                            y: number;
                                            w: number;
                                            h: number;
                                        };
                                        config: {
                                            title: string;
                                            data_source: {
                                                type: string;
                                                index_pattern: string;
                                                time_field: string;
                                            };
                                            type: string;
                                            sampling: number;
                                            ignore_global_filters: boolean;
                                            metrics: {
                                                type: string;
                                                operation: string;
                                                field: string;
                                            }[];
                                            styling: {
                                                primary: {
                                                    position: string;
                                                    labels: {
                                                        alignment: string;
                                                    };
                                                    value: {
                                                        sizing: string;
                                                        alignment: string;
                                                    };
                                                };
                                                overlays?: undefined;
                                                interpolation?: undefined;
                                                points?: undefined;
                                            };
                                            content?: undefined;
                                            layers?: undefined;
                                            axis?: undefined;
                                            legend?: undefined;
                                        };
                                        id: string;
                                        type: string;
                                    } | {
                                        grid: {
                                            x: number;
                                            y: number;
                                            w: number;
                                            h: number;
                                        };
                                        config: {
                                            title: string;
                                            type: string;
                                            layers: {
                                                type: string;
                                                data_source: {
                                                    type: string;
                                                    query: string;
                                                };
                                                sampling: number;
                                                ignore_global_filters: boolean;
                                                x: {
                                                    column: string;
                                                };
                                                y: {
                                                    column: string;
                                                    axis_id: string;
                                                }[];
                                            }[];
                                            axis: {
                                                x: {
                                                    title: {
                                                        visible: boolean;
                                                    };
                                                    ticks: {
                                                        visible: boolean;
                                                    };
                                                    grid: {
                                                        visible: boolean;
                                                    };
                                                    domain: {
                                                        type: string;
                                                        rounding: boolean;
                                                    };
                                                    labels: {
                                                        orientation: string;
                                                    };
                                                    scale: string;
                                                };
                                                y: {
                                                    anchor: string;
                                                    title: {
                                                        visible: boolean;
                                                    };
                                                    scale: string;
                                                    ticks: {
                                                        visible: boolean;
                                                    };
                                                    grid: {
                                                        visible: boolean;
                                                    };
                                                    domain: {
                                                        type: string;
                                                        rounding: boolean;
                                                    };
                                                    labels: {
                                                        orientation: string;
                                                    };
                                                };
                                            };
                                            styling: {
                                                overlays: {
                                                    partial_buckets: {
                                                        visible: boolean;
                                                    };
                                                    current_time_marker: {
                                                        visible: boolean;
                                                    };
                                                };
                                                interpolation: string;
                                                points: {
                                                    visibility: string;
                                                };
                                                primary?: undefined;
                                            };
                                            legend: {
                                                visibility: string;
                                                placement: string;
                                                position: string;
                                                layout: {
                                                    type: string;
                                                    truncate: {
                                                        max_lines: number;
                                                    };
                                                };
                                            };
                                            content?: undefined;
                                            data_source?: undefined;
                                            sampling?: undefined;
                                            ignore_global_filters?: undefined;
                                            metrics?: undefined;
                                        };
                                        id: string;
                                        type: string;
                                    } | {
                                        grid: {
                                            x: number;
                                            y: number;
                                            w: number;
                                            h: number;
                                        };
                                        config: {
                                            title: string;
                                            data_source: {
                                                type: string;
                                                index_pattern: string;
                                                time_field: string;
                                            };
                                            type: string;
                                            sampling: number;
                                            ignore_global_filters: boolean;
                                            metrics: {
                                                type: string;
                                                operation: string;
                                                field: string;
                                                empty_as_null: boolean;
                                            }[];
                                            styling: {
                                                primary: {
                                                    position: string;
                                                    labels: {
                                                        alignment: string;
                                                    };
                                                    value: {
                                                        sizing: string;
                                                        alignment: string;
                                                    };
                                                };
                                                overlays?: undefined;
                                                interpolation?: undefined;
                                                points?: undefined;
                                            };
                                            content?: undefined;
                                            layers?: undefined;
                                            axis?: undefined;
                                            legend?: undefined;
                                        };
                                        id: string;
                                        type: string;
                                    })[];
                                    pinned_panels: never[];
                                    title: string;
                                };
                                meta: {
                                    managed: false;
                                    updated_at: string;
                                    version: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        201: {
            content: {
                'application/json': {
                    examples: {
                        createDashboardResponse: {
                            summary: string;
                            description: string;
                            value: {
                                id: string;
                                data: {
                                    options: {
                                        hide_panel_titles: false;
                                        hide_panel_borders: false;
                                        use_margins: true;
                                        auto_apply_filters: true;
                                        sync_colors: false;
                                        sync_cursor: true;
                                        sync_tooltips: false;
                                    };
                                    panels: {
                                        grid: {
                                            x: number;
                                            y: number;
                                            w: number;
                                            h: number;
                                        };
                                        config: {
                                            title: string;
                                            data_source: {
                                                type: string;
                                                index_pattern: string;
                                                time_field: string;
                                            };
                                            type: string;
                                            sampling: number;
                                            ignore_global_filters: boolean;
                                            metrics: {
                                                type: string;
                                                operation: string;
                                                empty_as_null: boolean;
                                            }[];
                                            styling: {
                                                primary: {
                                                    position: string;
                                                    labels: {
                                                        alignment: string;
                                                    };
                                                    value: {
                                                        sizing: string;
                                                        alignment: string;
                                                    };
                                                };
                                            };
                                        };
                                        id: string;
                                        type: string;
                                    }[];
                                    pinned_panels: never[];
                                    title: string;
                                };
                                meta: {
                                    created_at: string;
                                    managed: false;
                                    updated_at: string;
                                    version: string;
                                };
                            };
                        };
                    };
                };
            };
        };
    };
};
export declare const deleteDashboardOASOperationObject: {
    'x-codeSamples': {
        lang: string;
        label: string;
        source: string;
    }[];
};
