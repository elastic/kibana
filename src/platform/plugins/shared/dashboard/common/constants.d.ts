/** The base API path for public dashboard endpoints. */
export declare const DASHBOARD_API_PATH = "/api/dashboards";
export declare const DASHBOARD_API_VERSION = "2023-10-31";
/** The base API path for internal dashboard endpoints. */
export declare const DASHBOARD_INTERNAL_API_PATH = "/internal/dashboards";
export declare const DASHBOARD_APP_API_PATH = "/internal/dashboards/app";
export declare const DASHBOARD_APP_API_VERSION = "1";
export declare const DASHBOARD_SAVED_OBJECT_TYPE = "dashboard";
export declare const DEFAULT_PANEL_WIDTH: number;
export declare const DEFAULT_PANEL_HEIGHT = 15;
export declare const DEFAULT_DASHBOARD_OPTIONS: {
    readonly hide_panel_titles: false;
    readonly hide_panel_borders: false;
    readonly use_margins: true;
    readonly auto_apply_filters: true;
    readonly sync_colors: false;
    readonly sync_cursor: true;
    readonly sync_tooltips: false;
};
export declare const UI_SETTINGS: {
    ENABLE_LABS_UI: string;
};
