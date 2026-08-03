import type { DashboardApi } from '../../../dashboard_api/types';
import type { MenuItem } from './types';
export declare const useFeaturedItems: ({ dashboardApi, returnFocus, }: {
    dashboardApi: DashboardApi;
    returnFocus?: () => void;
}) => {
    featuredItems: MenuItem[];
    loading: boolean;
};
