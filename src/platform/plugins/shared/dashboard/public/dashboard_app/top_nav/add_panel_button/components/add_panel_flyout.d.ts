import React from 'react';
import type { DashboardApi } from '../../../../dashboard_api/types';
declare const TAB_NEW_ID: "new";
declare const TAB_LIBRARY_ID: "library";
type FlyoutTab = typeof TAB_NEW_ID | typeof TAB_LIBRARY_ID;
export declare function AddPanelFlyout({ dashboardApi, ariaLabelledBy, initialTab, }: {
    dashboardApi: DashboardApi;
    ariaLabelledBy: string;
    initialTab?: FlyoutTab;
}): React.JSX.Element;
export {};
