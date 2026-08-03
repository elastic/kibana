import type { History } from 'history';
import type { NotificationsStart, IUiSettingsClient } from '@kbn/core/public';
import type { Filter } from '@kbn/es-query';
import type { ReduxLikeStateContainer } from '@kbn/kibana-utils-plugin/public';
import type { DataPublicPluginStart, FilterManager } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DiscoverGridSettings } from '@kbn/saved-search-plugin/common';
export interface AppState {
    /**
     * Columns displayed in the table, cannot be changed by UI, just in discover's main app
     */
    columns: string[];
    /**
     * Array of filters
     */
    filters: Filter[];
    /**
     * Data Grid related state
     */
    grid?: DiscoverGridSettings;
    /**
     * Number of records to be fetched before anchor records (newer records)
     */
    predecessorCount: number;
    /**
     * Number of records to be fetched after the anchor records (older records)
     */
    successorCount: number;
    /**
     * Array of the used sorting [[field,direction],...]
     * this is actually not needed in Discover Context, there's no sorting
     * but it's used in the DocTable component
     */
    sort?: string[][];
}
export interface GlobalState {
    /**
     * Array of filters
     */
    filters: Filter[];
}
export interface GetStateParams {
    /**
     * Number of records to be fetched when 'Load' link/button is clicked
     */
    defaultSize: number;
    /**
     * Determins the use of long vs. short/hashed urls
     */
    storeInSessionStorage?: boolean;
    /**
     * History instance to use
     */
    history: History;
    /**
     * Core's notifications.toasts service
     * In case it is passed in,
     * kbnUrlStateStorage will use it notifying about inner errors
     */
    toasts?: NotificationsStart['toasts'];
    /**
     * core ui settings service
     */
    uiSettings: IUiSettingsClient;
    /**
     * data service
     */
    data: DataPublicPluginStart;
    /**
     * the current data view
     */
    dataView: DataView;
}
export interface GetStateReturn {
    /**
     * Global state, the _g part of the URL
     */
    globalState: ReduxLikeStateContainer<GlobalState>;
    /**
     * App state, the _a part of the URL
     */
    appState: ReduxLikeStateContainer<AppState>;
    /**
     * Start sync between state and URL
     */
    startSync: () => void;
    /**
     * Stop sync between state and URL
     */
    stopSync: () => void;
    /**
     * Set app state to with a partial new app state
     */
    setAppState: (newState: Partial<AppState>) => void;
    /**
     * Get all filters, global and app state
     */
    getFilters: () => Filter[];
    /**
     * Set global state and app state filters by the given FilterManager instance
     * @param filterManager
     */
    setFilters: (filterManager: FilterManager) => void;
    /**
     * sync state to URL, used for testing
     */
    flushToUrl: (replace?: boolean) => void;
}
/**
 * Builds and returns appState and globalState containers
 * provides helper functions to start/stop syncing with URL
 */
export declare function getState({ defaultSize, storeInSessionStorage, history, toasts, uiSettings, data, dataView, }: GetStateParams): GetStateReturn;
/**
 * Helper function to compare 2 different filter states
 */
export declare function isEqualFilters(filtersA: Filter[], filtersB: Filter[]): boolean;
