import { ContentInsightsClient } from '@kbn/content-management-content-insights-public';
import type { TableListViewTableProps } from '@kbn/content-management-table-list-view-table';
import type { ViewMode } from '@kbn/presentation-publishing';
import type { DashboardSavedObjectUserContent } from '../types';
type DashboardListingViewTableProps = Omit<TableListViewTableProps<DashboardSavedObjectUserContent>, 'tableCaption'> & {
    title: string;
};
interface UseDashboardListingTableReturnType {
    hasInitialFetchReturned: boolean;
    pageDataTestSubject: string | undefined;
    refreshUnsavedDashboards: () => void;
    tableListViewTableProps: DashboardListingViewTableProps;
    unsavedDashboardIds: string[];
    contentInsightsClient: ContentInsightsClient;
}
export declare const useDashboardListingTable: ({ dashboardListingId, disableCreateDashboardButton, getDashboardUrl, goToDashboard, headingId, initialFilter, urlStateEnabled, useSessionStorageIntegration, showCreateDashboardButton, }: {
    dashboardListingId?: string;
    disableCreateDashboardButton?: boolean;
    getDashboardUrl: (dashboardId: string, usesTimeRestore: boolean) => string;
    goToDashboard: (dashboardId?: string, viewMode?: ViewMode) => void;
    headingId?: string;
    initialFilter?: string;
    urlStateEnabled?: boolean;
    useSessionStorageIntegration?: boolean;
    showCreateDashboardButton?: boolean;
}) => UseDashboardListingTableReturnType;
export {};
