import type { SerializableRecord } from '@kbn/utility-types';
import type { Filter, TimeRange } from '@kbn/es-query';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import type { DashboardLocatorParams } from '../types';
/**
 * Removes keys with `undefined` values from a state object.
 * This mutates the original object and returns it.
 *
 * @param stateObj - The state object to clean.
 * @returns The same object with undefined keys removed.
 */
export declare const cleanEmptyKeys: (stateObj: Record<string, unknown>) => Record<string, unknown>;
export type DashboardAppLocator = LocatorPublic<DashboardLocatorParams>;
export interface DashboardAppLocatorDependencies {
    useHashedUrl: boolean;
    getDashboardFilterFields: (dashboardId: string) => Promise<Filter[]>;
}
export type ForwardedDashboardState = Omit<DashboardLocatorParams, 'dashboardId' | 'preserveSavedFilters' | 'useHash' | 'searchSessionId'>;
/**
 * Locator definition for the Dashboard application.
 * This class is responsible for generating URLs and navigation state for dashboard links.
 */
export declare class DashboardAppLocatorDefinition implements LocatorDefinition<DashboardLocatorParams> {
    protected readonly deps: DashboardAppLocatorDependencies;
    /** The unique identifier for the dashboard app locator. */
    readonly id = "DASHBOARD_APP_LOCATOR";
    /**
     * Creates a new DashboardAppLocatorDefinition.
     *
     * @param deps - The dependencies required for the locator.
     */
    constructor(deps: DashboardAppLocatorDependencies);
    readonly getTimeRange: (params: DashboardLocatorParams) => Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
    readonly setTimeRange: (params: DashboardLocatorParams, timeRange?: TimeRange) => {
        time_range: TimeRange | undefined;
        description?: string | undefined;
        title?: string | undefined;
        panels?: (Readonly<{
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
        }>)[] | undefined;
        options?: Readonly<{} & {
            auto_apply_filters: boolean;
            hide_panel_titles: boolean;
            hide_panel_borders: boolean;
            use_margins: boolean;
            sync_colors: boolean;
            sync_tooltips: boolean;
            sync_cursor: boolean;
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
        pinned_panels?: (Readonly<{
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
        }>)[] | undefined;
        esql_approximation?: boolean | undefined;
        filters?: Filter[] | undefined;
        query?: import("@kbn/es-query").Query | undefined;
        viewMode?: import("@kbn/presentation-publishing").ViewMode | undefined;
        dashboardId?: string | undefined;
        useHash?: boolean | undefined;
        preserveSavedFilters?: boolean | undefined;
        searchSessionId?: string | undefined;
    };
    /**
     * Generates the location for a dashboard based on the provided parameters.
     *
     * @param params - The {@link DashboardLocatorParams} to use for generating the location.
     * @returns A promise that resolves to the location object containing app, path, and state.
     */
    readonly getLocation: (params: DashboardLocatorParams) => Promise<{
        app: string;
        path: string;
        state: Record<string, unknown> & SerializableRecord;
    }>;
}
