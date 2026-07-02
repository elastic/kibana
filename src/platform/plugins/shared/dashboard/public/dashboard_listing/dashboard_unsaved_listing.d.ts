import React from 'react';
import type { ViewMode } from '@kbn/presentation-publishing';
export interface DashboardUnsavedListingProps {
    unsavedDashboardIds: string[];
    refreshUnsavedDashboards: () => void;
    goToDashboard: (dashboardId?: string, viewMode?: ViewMode) => void;
}
export declare const DashboardUnsavedListing: ({ goToDashboard, unsavedDashboardIds, refreshUnsavedDashboards, }: DashboardUnsavedListingProps) => React.JSX.Element | null;
