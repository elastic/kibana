import { BehaviorSubject, type Observable } from 'rxjs';
import type { DefaultEmbeddableApi, EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import type { GridLayoutData } from '@kbn/grid-layout';
import type { PinnedControlLayoutState as PinnedPanelLayoutState } from '@kbn/controls-schemas';
import type { PanelPackage } from '@kbn/presentation-publishing';
import type { PinnedControlLayoutState } from '@kbn/controls-schemas';
import type { DashboardState } from '../../../common';
import type { DashboardPanel } from '../../../server';
import type { initializeTrackPanel } from '../track_panel';
import type { initializeViewModeManager } from '../view_mode_manager';
import { type DashboardChildren, type DashboardLayout, type DashboardLayoutPanel } from './types';
export declare function initializeLayoutManager(viewModeManager: ReturnType<typeof initializeViewModeManager>, incomingEmbeddables: EmbeddablePackageState[] | undefined, initialPanels: DashboardState['panels'], initialPinnedPanels: DashboardState['pinned_panels'], trackPanel: ReturnType<typeof initializeTrackPanel>): {
    internalApi: {
        anyStateChange$: Observable<void | undefined>;
        getSerializedStateForPanel: (panelId: string) => object;
        getLastSavedStateForPanel: (panelId: string) => object;
        gridLayout$: BehaviorSubject<GridLayoutData>;
        childrenLoading$: Observable<boolean>;
        reset: (state: DashboardState) => void;
        serializeLayout: () => Pick<import("@kbn/utility-types").Writable<Readonly<{
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
        }>>, "panels" | "pinned_panels">;
        startComparing: (lastSavedState$: BehaviorSubject<DashboardState>) => Observable<{
            panels?: DashboardState["panels"];
            pinned_panels?: DashboardState["pinned_panels"];
        }>;
        isSectionCollapsed: (sectionId?: string) => boolean;
    };
    api: {
        layout$: BehaviorSubject<DashboardLayout>;
        getLayout: (id: string) => DashboardLayoutPanel;
        setLayout: (id: string, newLayout: DashboardLayoutPanel | PinnedPanelLayoutState) => void;
        registerChildApi: (api: DefaultEmbeddableApi) => void;
        /** Panels */
        children$: BehaviorSubject<DashboardChildren>;
        getChildApi: (uuid: string) => Promise<DefaultEmbeddableApi | undefined>;
        addNewPanel: <ApiType>(panelPackage: PanelPackage, options?: {
            displaySuccessMessage?: boolean;
            scrollToPanel?: boolean;
            beside?: string;
        }, grid?: DashboardPanel["grid"]) => Promise<ApiType>;
        addIncomingEmbeddables: (embeddables?: EmbeddablePackageState[]) => void;
        removePanel: (uuid: string) => void;
        replacePanel: (idToRemove: string, panelPackage: PanelPackage) => Promise<string>;
        duplicatePanel: (uuidToDuplicate: string) => Promise<void>;
        getDashboardPanelFromId: (panelId: string) => {
            type: string;
            grid: (Readonly<{} & {
                y: number;
                w: number;
                h: number;
                x: number;
            }> & {
                sectionId?: string;
            }) | null;
            serializedState: object;
        };
        getPanelCount: () => number;
        canRemovePanels: () => boolean;
        /** Pinned panels (only controls can currently be pinned) */
        panelIsPinned: (uuid: string) => boolean;
        unpinPanel: (uuid: string) => void;
        pinPanel: (uuid: string) => void;
        addPinnedPanel: (panelPackage: PanelPackage, prevLayoutState?: Partial<PinnedControlLayoutState>) => Promise<DefaultEmbeddableApi<object> | {
            uuid: string;
        }>;
        /** Sections */
        addNewSection: () => void;
        getPanelSection: (uuid: string) => string | undefined;
        panelSection$: (uuid: string) => Observable<string | undefined>;
    };
    cleanup: () => void;
};
