import type { PropsWithChildren } from 'react';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { ViewMode } from '@kbn/presentation-publishing';
import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
import type { TableListTab } from '@kbn/content-management-tabbed-table-list-view';
import type { AppDeepLinkLocations } from '@kbn/core/public';
/** Tab interface with optional deep link support. */
export type DashboardListingTab = TableListTab & {
    deepLink?: {
        /** Title to display in global search results */
        title: string;
        /** Where this deep link should be visible. */
        visibleIn?: AppDeepLinkLocations[];
    };
};
export type DashboardListingProps = PropsWithChildren<{
    disableCreateDashboardButton?: boolean;
    initialFilter?: string;
    useSessionStorageIntegration?: boolean;
    goToDashboard: (dashboardId?: string, viewMode?: ViewMode) => void;
    getDashboardUrl: (dashboardId: string, usesTimeRestore: boolean) => string;
    urlStateEnabled?: boolean;
    showCreateDashboardButton?: boolean;
    getTabs?: () => DashboardListingTab[];
}>;
export interface DashboardSavedObjectUserContent extends UserContentCommonSchema {
    managed?: boolean;
    attributes: {
        title: string;
        description?: string;
        timeRestore: boolean;
    };
    canManageAccessControl?: boolean;
    accessMode?: SavedObjectAccessControl['accessMode'];
}
