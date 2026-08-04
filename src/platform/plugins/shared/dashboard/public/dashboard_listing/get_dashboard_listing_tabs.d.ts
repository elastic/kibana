import type { DashboardListingProps, DashboardListingTab } from './types';
type GetDashboardListingTabsParams = Pick<DashboardListingProps, 'goToDashboard' | 'getDashboardUrl' | 'useSessionStorageIntegration' | 'initialFilter' | 'getTabs'>;
export declare const getDashboardListingTabs: ({ goToDashboard, getDashboardUrl, useSessionStorageIntegration, initialFilter, getTabs, }: GetDashboardListingTabsParams) => DashboardListingTab[];
export {};
