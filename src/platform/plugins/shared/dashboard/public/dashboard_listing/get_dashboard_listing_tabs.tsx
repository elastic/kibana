/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { TableListTabParentProps } from '@kbn/content-management-tabbed-table-list-view';
import {
  TableListViewTable,
  TableListViewKibanaProvider,
} from '@kbn/content-management-table-list-view-table';
import { FormattedRelative } from '@kbn/i18n-react';
import { createDashboardFavoritesClient } from '../dashboard_navigation/fetch_starred_dashboards';
import {
  coreServices,
  savedObjectsTaggingService,
  serverlessService,
} from '../services/kibana_services';
import { DashboardUnsavedListing } from './dashboard_unsaved_listing';
import { useDashboardListingTable } from './hooks/use_dashboard_listing_table';
import { confirmCreateWithUnsaved } from './confirm_overlays';
import { getDashboardBackupService } from '../services/dashboard_api_services';
import type {
  DashboardListingProps,
  DashboardListingTab,
  DashboardSavedObjectUserContent,
} from './types';

type GetDashboardListingTabsParams = Pick<
  DashboardListingProps,
  'goToDashboard' | 'getDashboardUrl' | 'useSessionStorageIntegration' | 'initialFilter' | 'getTabs'
>;

type TabContentProps = Omit<GetDashboardListingTabsParams, 'getTabs'> & {
  parentProps: TableListTabParentProps<DashboardSavedObjectUserContent>;
};

const getBaseKibanaProviderProps = () => ({
  core: coreServices,
  savedObjectsTagging: savedObjectsTaggingService?.getTaggingApi(),
  FormattedRelative,
  isKibanaVersioningEnabled: !serverlessService,
});

const DashboardsTabContent = ({
  goToDashboard,
  getDashboardUrl,
  useSessionStorageIntegration,
  initialFilter,
  parentProps,
}: TabContentProps) => {
  const {
    unsavedDashboardIds,
    refreshUnsavedDashboards,
    tableListViewTableProps,
    contentInsightsClient,
  } = useDashboardListingTable({
    goToDashboard,
    getDashboardUrl,
    useSessionStorageIntegration,
    initialFilter,
    showCreateDashboardButton: parentProps.showCreateButton,
  });

  const dashboardFavoritesClient = useMemo(() => createDashboardFavoritesClient(coreServices), []);

  return (
    <TableListViewKibanaProvider
      {...getBaseKibanaProviderProps()}
      favorites={dashboardFavoritesClient}
      contentInsightsClient={contentInsightsClient}
    >
      <DashboardUnsavedListing
        goToDashboard={goToDashboard}
        unsavedDashboardIds={unsavedDashboardIds}
        refreshUnsavedDashboards={refreshUnsavedDashboards}
      />
      <TableListViewTable<DashboardSavedObjectUserContent>
        tableCaption={tableListViewTableProps.title}
        {...tableListViewTableProps}
        onFetchSuccess={parentProps.onFetchSuccess}
        setPageDataTestSubject={parentProps.setPageDataTestSubject}
      />
    </TableListViewKibanaProvider>
  );
};

export const getDashboardListingTabs = ({
  goToDashboard,
  getDashboardUrl,
  useSessionStorageIntegration,
  initialFilter,
  getTabs,
}: GetDashboardListingTabsParams): DashboardListingTab[] => {
  const commonProps = {
    goToDashboard,
    getDashboardUrl,
    useSessionStorageIntegration,
    initialFilter,
  };

  const dashboardsTab: DashboardListingTab = {
    title: i18n.translate('dashboard.listing.tabs.dashboards.title', {
      defaultMessage: 'Dashboards',
    }),
    id: 'dashboards',
    getTableList: (parentProps) => (
      <DashboardsTabContent {...commonProps} parentProps={parentProps} />
    ),
    createAction: () => {
      if (useSessionStorageIntegration && getDashboardBackupService().dashboardHasUnsavedEdits()) {
        confirmCreateWithUnsaved(() => {
          getDashboardBackupService().clearState();
          goToDashboard();
        }, goToDashboard);
        return;
      }
      goToDashboard();
    },
  };

  // Additional tabs (e.g., visualizations and annotation groups)
  const additionalTabs = getTabs ? getTabs() : [];

  return [dashboardsTab, ...additionalTabs];
};
