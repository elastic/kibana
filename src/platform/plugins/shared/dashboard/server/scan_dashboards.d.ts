import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { Reference } from '@kbn/content-management-utils';
import type { DashboardState } from './api';
import type { getDashboardStateSchema } from './api/dashboard_state_schemas';
/**
 * The result of scanning dashboards.
 * Contains a paginated list of dashboard summaries.
 */
export interface ScanDashboardsResult {
    /** Array of dashboard summaries with their metadata. */
    dashboards: Array<Pick<DashboardState, 'description' | 'panels' | 'tags' | 'title'> & {
        id: string;
        references: Reference[];
    }>;
    /** The current page number. */
    page: number;
    /** The total number of dashboards. */
    total: number;
}
export declare function scanDashboards(savedObjectsClient: SavedObjectsClientContract, page: number, perPage: number, strictValidationSchema: ReturnType<typeof getDashboardStateSchema>): Promise<ScanDashboardsResult>;
