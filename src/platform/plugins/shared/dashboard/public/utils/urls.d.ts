export declare const DASHBOARD_STATE_STORAGE_KEY = "_a";
export declare const GLOBAL_STATE_STORAGE_KEY = "_g";
export declare const CREATE_NEW_DASHBOARD_URL = "/create";
export declare const VIEW_DASHBOARD_URL = "/view";
export declare const PRINT_DASHBOARD_URL = "/print";
export declare const getFullPath: (aliasId?: string, id?: string) => string;
export declare const getFullEditPath: (id?: string, editMode?: boolean) => string;
export declare function createDashboardEditUrl(id?: string, editMode?: boolean): string;
export declare function createDashboardListingFilterUrl(filter: string | undefined): string;
