import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ScanDashboardsResult } from './scan_dashboards';
import type { DashboardReadResponseBody } from './api';
/**
 * Client interface for dashboard CRUD operations
 */
export interface DashboardServerClient {
    read(savedObjectsClient: SavedObjectsClientContract, id: string): Promise<DashboardReadResponseBody>;
}
/** The setup contract for the Dashboard plugin on the server. */
export interface DashboardPluginSetup {
}
/**
 * The start contract for the Dashboard plugin on the server.
 * Provides methods for interacting with dashboards.
 */
export interface DashboardPluginStart {
    /** Client for dashboard CRUD operations. */
    client: DashboardServerClient;
    /**
     * Scans dashboards with pagination.
     *
     * @deprecated Contact #kibana-presentation about requirements for a proper panel search interface.
     * @param ctx - The request handler context.
     * @param page - The page number.
     * @param perPage - The number of items per page.
     * @returns A promise that resolves to the {@link ScanDashboardsResult}.
     */
    scanDashboards: (savedObjectsClient: SavedObjectsClientContract, page: number, perPage: number) => Promise<ScanDashboardsResult>;
}
