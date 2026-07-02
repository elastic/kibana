import type { TableListTab } from '@kbn/content-management-tabbed-table-list-view';
import type { DashboardListingProps, DashboardSavedObjectUserContent } from './types';
type GetDashboardListingTabsParams = Pick<DashboardListingProps, 'goToDashboard' | 'getDashboardUrl' | 'useSessionStorageIntegration' | 'initialFilter' | 'getTabs'>;
export declare const getDashboardListingTabs: ({ goToDashboard, getDashboardUrl, useSessionStorageIntegration, initialFilter, getTabs, }: GetDashboardListingTabsParams) => TableListTab<DashboardSavedObjectUserContent>[];
export {};
