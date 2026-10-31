/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef } from 'react';
import type { KibanaContentListPageTab } from '@kbn/content-list-page';
import type { TableListTabParentProps } from '@kbn/content-management-tabbed-table-list-view';
import { FavoritesClient } from '@kbn/content-management-favorites-public';
import { ContentListClientProvider } from '@kbn/content-list-provider-client';
import { i18n } from '@kbn/i18n';
import { useContentListItems } from '@kbn/content-list';
import { DASHBOARD_APP_ID } from '../../common/page_bundle_constants';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../common/constants';
import { coreServices, usageCollectionService } from '../services/kibana_services';
import { useDashboardListingTable } from './hooks/use_dashboard_listing_table';
import type {
  DashboardListingProps,
  DashboardListingTab,
  DashboardSavedObjectUserContent,
} from './types';
import { DashboardContentList } from './dashboard_content_list';

export type GetDashboardListingTabsParams = Pick<
  DashboardListingProps,
  'goToDashboard' | 'getDashboardUrl' | 'useSessionStorageIntegration' | 'initialFilter' | 'getTabs'
> & {
  refreshListBouncer?: boolean;
};

type TabContentProps = Omit<GetDashboardListingTabsParams, 'getTabs'> & {
  parentProps: TableListTabParentProps<DashboardSavedObjectUserContent>;
};

const RefetchOnImport = ({ signal }: { signal?: boolean }) => {
  const { refetch } = useContentListItems();
  const previousSignal = useRef(signal);

  useEffect(() => {
    if (previousSignal.current === signal) {
      return;
    }

    previousSignal.current = signal;
    void refetch();
  }, [signal, refetch]);
  return null;
};

const DashboardsTabContent = ({
  goToDashboard,
  getDashboardUrl,
  useSessionStorageIntegration,
  initialFilter,
  refreshListBouncer,
  parentProps,
}: TabContentProps) => {
  const { setPageDataTestSubject, onFetchSuccess } = parentProps;

  const { contentListProviderProps, emptyState, unsavedDashboardIds, refreshUnsavedDashboards } =
    useDashboardListingTable({
      goToDashboard,
      getDashboardUrl,
      useSessionStorageIntegration,
      initialFilter,
    });

  const dashboardFavoritesClient = useMemo(
    () =>
      new FavoritesClient(DASHBOARD_APP_ID, DASHBOARD_SAVED_OBJECT_TYPE, {
        http: coreServices.http,
        usageCollection: usageCollectionService,
        userProfile: coreServices.userProfile,
      }),
    []
  );

  const services = useMemo(
    () => ({
      ...contentListProviderProps.services,
      favorites: dashboardFavoritesClient,
    }),
    [contentListProviderProps.services, dashboardFavoritesClient]
  );

  useEffect(() => {
    setPageDataTestSubject('dashboardLandingPage');
  }, [setPageDataTestSubject]);

  return (
    <ContentListClientProvider
      {...contentListProviderProps}
      services={services}
      onFetchSuccess={onFetchSuccess}
    >
      <RefetchOnImport signal={refreshListBouncer} />
      <DashboardContentList
        emptyState={emptyState}
        goToDashboard={goToDashboard}
        unsavedDashboardIds={unsavedDashboardIds}
        refreshUnsavedDashboards={refreshUnsavedDashboards}
      />
    </ContentListClientProvider>
  );
};

export const getDashboardListingTabs = ({
  goToDashboard,
  getDashboardUrl,
  useSessionStorageIntegration,
  initialFilter,
  getTabs,
  refreshListBouncer,
}: GetDashboardListingTabsParams): DashboardListingTab[] => {
  const commonProps = {
    goToDashboard,
    getDashboardUrl,
    useSessionStorageIntegration,
    initialFilter,
    refreshListBouncer,
  };

  const dashboardsTab: DashboardListingTab = {
    title: i18n.translate('dashboard.listing.tabs.dashboards.title', {
      defaultMessage: 'Dashboards',
    }),
    id: DASHBOARD_APP_ID,
    getTableList: (parentProps) => (
      <DashboardsTabContent {...commonProps} parentProps={parentProps} />
    ),
  };
  return [dashboardsTab, ...(getTabs?.() ?? [])];
};

/**
 * Adapts the listing tabs to `KibanaContentListPage.ActiveTab`. The Dashboards tab renders
 * synchronously; registered tabs resolve their legacy `getTableList` content asynchronously.
 */
export const toContentListPageTabs = (
  tabs: DashboardListingTab[],
  { parentProps, ...commonProps }: TabContentProps
): KibanaContentListPageTab[] =>
  tabs.map(({ id, getTableList }) =>
    id === DASHBOARD_APP_ID
      ? { id, render: () => <DashboardsTabContent {...commonProps} parentProps={parentProps} /> }
      : { id, load: async () => getTableList(parentProps) }
  );
