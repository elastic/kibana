import type { AppMountParameters, ScopedHistory } from '@kbn/core-application-browser';
import type { DashboardListingTab } from '../dashboard_listing/types';
export interface DashboardEmbedSettings {
    forceHideFilterBar?: boolean;
    forceShowTopNavMenu?: boolean;
    forceShowQueryInput?: boolean;
    forceShowDatePicker?: boolean;
}
export interface DashboardMountContextProps {
    restorePreviousUrl: () => void;
    scopedHistory: () => ScopedHistory;
    onAppLeave: AppMountParameters['onAppLeave'];
    setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
    getListingTabs: () => DashboardListingTab[];
}
export type DashboardRedirect = (props: RedirectToProps) => void;
/**
 * Properties for redirecting within the dashboard application.
 * Can redirect to either a specific dashboard or the listing page.
 */
export type RedirectToProps = {
    destination: 'dashboard';
    id?: string;
    useReplace?: boolean;
    editMode?: boolean;
} | {
    destination: 'listing';
    filter?: string;
    useReplace?: boolean;
};
