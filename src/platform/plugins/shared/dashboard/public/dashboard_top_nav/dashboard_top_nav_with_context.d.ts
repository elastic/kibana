import React from 'react';
import type { InternalDashboardTopNavProps } from './internal_dashboard_top_nav';
import type { DashboardApi, DashboardInternalApi } from '../dashboard_api/types';
export interface DashboardTopNavProps extends InternalDashboardTopNavProps {
    dashboardApi: DashboardApi;
    dashboardInternalApi: DashboardInternalApi;
}
export declare const DashboardTopNavWithContext: (props: DashboardTopNavProps) => React.JSX.Element;
