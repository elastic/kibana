import type { DashboardApi } from '../../../dashboard_api/types';
import type { MenuItemGroup } from './types';
export declare const useMenuItemGroups: ({ dashboardApi, }: {
    dashboardApi: DashboardApi;
}) => {
    groups: MenuItemGroup[] | undefined;
    loading: boolean;
    error: Error | undefined;
};
