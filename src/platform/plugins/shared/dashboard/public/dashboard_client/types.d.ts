import type { DashboardSearchRequestParams, DashboardSearchResponseBody, DashboardState } from '../../server';
/**
 * Types for Finding Dashboards
 */
export type FindDashboardsByIdResponse = {
    id: string;
} & ({
    status: 'success';
    attributes: DashboardState;
} | {
    status: 'error';
    notFound: boolean;
    error: Error;
});
export interface FindDashboardsService {
    search: (search: DashboardSearchRequestParams) => Promise<DashboardSearchResponseBody>;
    findById: (id: string) => Promise<FindDashboardsByIdResponse>;
    findByIds: (ids: string[]) => Promise<FindDashboardsByIdResponse[]>;
    findByTitle: (title: string) => Promise<{
        id: string;
    } | undefined>;
}
