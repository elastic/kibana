import type { DashboardApi } from '../../../dashboard_api/types';
import type { MenuItem } from './types';
export declare const useFeaturedItems: ({ dashboardApi, }: {
    dashboardApi: DashboardApi;
}) => {
    featuredItems: MenuItem[];
    loading: boolean;
};
