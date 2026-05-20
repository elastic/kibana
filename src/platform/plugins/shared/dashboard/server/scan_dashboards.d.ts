import type { RequestHandlerContext } from '@kbn/core/server';
import type { Reference } from '@kbn/content-management-utils';
import type { DashboardState } from './api';
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
export declare function scanDashboards(ctx: RequestHandlerContext, page: number, perPage: number): Promise<ScanDashboardsResult>;
