import React from 'react';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { DashboardLocatorParams } from '../../common';
import type { DashboardApi, DashboardInternalApi } from '../dashboard_api/types';
import type { DashboardCreationOptions } from '..';
import type { DashboardRedirect } from '../dashboard_app/types';
/**
 * Props for the {@link DashboardRenderer} component.
 */
export interface DashboardRendererProps {
    /** Optional locator for dashboard navigation and URL generation. */
    locator?: Pick<LocatorPublic<DashboardLocatorParams>, 'navigate' | 'getRedirectUrl'>;
    /** The ID of the saved dashboard to load. If not provided, creates a new dashboard. */
    savedObjectId?: string;
    /** Whether to show a plain spinner instead of the Elastic loading animation. */
    showPlainSpinner?: boolean;
    /** Callback for redirecting within the dashboard application. */
    dashboardRedirect?: DashboardRedirect;
    /** Function that returns the creation options for the dashboard. */
    getCreationOptions?: () => Promise<DashboardCreationOptions>;
    /**
     * Callback invoked when the dashboard API becomes available.
     *
     * @param api - The {@link DashboardApi} instance.
     * @param internalApi - The {@link DashboardInternalApi} instance.
     */
    onApiAvailable?: (api: DashboardApi, internalApi: DashboardInternalApi) => void;
    /**
     * Callback invoked when the dashboard API is destroyed.
     */
    onApiCleanup?: () => void;
}
export declare function DashboardRenderer({ locator, savedObjectId, showPlainSpinner, dashboardRedirect, getCreationOptions, onApiAvailable, onApiCleanup, }: DashboardRendererProps): React.JSX.Element;
