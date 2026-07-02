import React from 'react';
import type { EuiBreadcrumb } from '@elastic/eui';
import type { MountPoint } from '@kbn/core/public';
import type { DashboardEmbedSettings, DashboardRedirect } from '../dashboard_app/types';
export interface InternalDashboardTopNavProps {
    customLeadingBreadCrumbs?: EuiBreadcrumb[];
    embedSettings?: DashboardEmbedSettings;
    forceHideUnifiedSearch?: boolean;
    redirectTo: DashboardRedirect;
    setCustomHeaderActionMenu?: (menuMount: MountPoint<HTMLElement> | undefined) => void;
    showBorderBottom?: boolean;
    showResetChange?: boolean;
}
export declare function InternalDashboardTopNav({ customLeadingBreadCrumbs, embedSettings, forceHideUnifiedSearch, redirectTo, showBorderBottom, showResetChange, }: InternalDashboardTopNavProps): React.JSX.Element;
