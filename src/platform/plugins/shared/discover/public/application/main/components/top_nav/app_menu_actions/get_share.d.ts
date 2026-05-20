import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type { AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import type { ShowShareMenuOptions } from '@kbn/share-plugin/public';
import type { IntlShape } from '@kbn/i18n-react';
import type { ReportingCSVSharingData } from '@kbn/reporting-public/types';
import type { DataTotalHitsMsg } from '../../../state_management/discover_data_state_container';
import type { DiscoverAppLocatorParams } from '../../../../../../common/app_locator';
import type { AppMenuDiscoverParams } from './types';
import type { DiscoverServices } from '../../../../../build_services';
import type { TabState } from '../../../state_management/redux';
interface BuildShareOptionsParams {
    discoverParams: AppMenuDiscoverParams;
    services: DiscoverServices;
    currentTab: TabState;
    persistedDiscoverSession: DiscoverSession | undefined;
    totalHitsState: DataTotalHitsMsg;
    hasUnsavedChanges: boolean;
}
/**
 * Builds share options for both share modal and export integrations
 */
export declare const buildShareOptions: ({ discoverParams, services, currentTab, persistedDiscoverSession, totalHitsState, hasUnsavedChanges, }: BuildShareOptionsParams) => Promise<Omit<ShowShareMenuOptions<DiscoverAppLocatorParams, ReportingCSVSharingData>, "anchorElement" | "asExport">>;
export declare const getShareAppMenuItem: ({ discoverParams, services, hasIntegrations, hasUnsavedChanges, currentTab, persistedDiscoverSession, totalHitsState, intl, }: {
    discoverParams: AppMenuDiscoverParams;
    services: DiscoverServices;
    hasIntegrations: boolean;
    hasUnsavedChanges: boolean;
    currentTab: TabState;
    persistedDiscoverSession: DiscoverSession | undefined;
    totalHitsState: DataTotalHitsMsg;
    intl: IntlShape;
}) => AppMenuItemType[];
export {};
