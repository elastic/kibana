import type { Filter, Query } from '@kbn/es-query';
import type { ViewMode } from '@kbn/presentation-publishing';
import type { DashboardState, DashboardPinnedPanelsState, DashboardPinnedPanel } from '../server';
export type { DashboardState, DashboardPinnedPanelsState, DashboardPinnedPanel };
/**
 * Capabilities object for the Dashboard application.
 * Defines the permissions available for dashboard operations.
 */
export interface DashboardCapabilities {
    /** Whether the user can see write controls (edit, save, etc.). */
    showWriteControls: boolean;
    /** Whether the user can create new dashboards. */
    createNew: boolean;
    /** Whether the user can view dashboards. */
    show: boolean;
    /** Additional capability flags. */
    [key: string]: boolean;
}
/**
 * Parameters for the dashboard locator.
 * Used to navigate to a specific dashboard with optional state.
 */
export type DashboardLocatorParams = Partial<Omit<DashboardState, 'filters' | 'query'> & {
    /**
     * Filters to apply. Pinned-ness is encoded on each filter (`$state.store`).
     */
    filters?: Filter[];
    query?: Query;
    viewMode?: ViewMode;
    /**
     * If provided, the dashboard with this id will be loaded. If not given, new, unsaved dashboard will be loaded.
     */
    dashboardId?: string;
    /**
     * Determines whether to hash the contents of the url to avoid url length issues. Defaults to the uiSettings configuration for `storeInSessionStorage`.
     */
    useHash?: boolean;
    /**
     * Denotes whether to merge provided filters from the locator state with the filters saved into the Dashboard.
     * When false, the saved filters will be overwritten. Defaults to true.
     */
    preserveSavedFilters?: boolean;
    /**
     * Search search session ID to restore.
     * (Background search)
     */
    searchSessionId?: string;
}>;
