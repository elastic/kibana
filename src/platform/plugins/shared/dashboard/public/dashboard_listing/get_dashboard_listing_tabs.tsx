/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { logicalSizeCSS, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  TableListTab,
  TableListTabParentProps,
} from '@kbn/content-management-tabbed-table-list-view';
import {
  TableListViewTable,
  TableListViewKibanaProvider,
} from '@kbn/content-management-table-list-view-table';
import { FormattedRelative } from '@kbn/i18n-react';
import { FavoritesClient } from '@kbn/content-management-favorites-public';
import { DASHBOARD_APP_ID } from '../../common/page_bundle_constants';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../common/constants';
import {
  coreServices,
  savedObjectsTaggingService,
  serverlessService,
  usageCollectionService,
} from '../services/kibana_services';
import { DashboardUnsavedListing } from './dashboard_unsaved_listing';
import { useDashboardListingTable } from './hooks/use_dashboard_listing_table';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import { TAB_IDS, type DashboardListingProps } from './types';

type GetDashboardListingTabsParams = Pick<
  DashboardListingProps,
  | 'goToDashboard'
  | 'getDashboardUrl'
  | 'useSessionStorageIntegration'
  | 'initialFilter'
  | 'listingViewRegistry'
>;

type TabContentProps = Omit<GetDashboardListingTabsParams, 'listingViewRegistry'> & {
  parentProps: TableListTabParentProps<UserContentCommonSchema>;
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
    contentTypeFilter: TAB_IDS.DASHBOARDS,
  });

  const dashboardFavoritesClient = useMemo(() => {
    return new FavoritesClient(DASHBOARD_APP_ID, DASHBOARD_SAVED_OBJECT_TYPE, {
      http: coreServices.http,
      usageCollection: usageCollectionService,
      userProfile: coreServices.userProfile,
    });
  }, []);

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
      <TableListViewTable<UserContentCommonSchema>
        tableCaption={tableListViewTableProps.title}
        {...tableListViewTableProps}
        {...parentProps}
      />
    </TableListViewKibanaProvider>
  );
};

const VisualizationsTabContent = ({
  goToDashboard,
  getDashboardUrl,
  useSessionStorageIntegration,
  initialFilter,
  parentProps,
}: TabContentProps) => {
  const { euiTheme } = useEuiTheme();
  const { tableListViewTableProps } = useDashboardListingTable({
    goToDashboard,
    getDashboardUrl,
    useSessionStorageIntegration,
    initialFilter,
    contentTypeFilter: TAB_IDS.VISUALIZATIONS,
  });

  return (
    <TableListViewKibanaProvider {...getBaseKibanaProviderProps()}>
      <div
        css={css`
          .visListingTable__typeImage,
          .visListingTable__typeIcon {
            margin-right: ${euiTheme.size.s};
            position: relative;
            top: -1px;
          }

          .visListingTable__typeImage {
            ${logicalSizeCSS(euiTheme.size.base, euiTheme.size.base)};
          }
        `}
      >
        <TableListViewTable<UserContentCommonSchema>
          tableCaption={tableListViewTableProps.title}
          {...tableListViewTableProps}
          {...parentProps}
        />
      </div>
    </TableListViewKibanaProvider>
  );
};

export const getDashboardListingTabs = ({
  goToDashboard,
  getDashboardUrl,
  useSessionStorageIntegration,
  initialFilter,
  listingViewRegistry,
}: GetDashboardListingTabsParams): TableListTab<UserContentCommonSchema>[] => {
  const commonProps = {
    goToDashboard,
    getDashboardUrl,
    useSessionStorageIntegration,
    initialFilter,
  };

  const dashboardsTab: TableListTab<UserContentCommonSchema> = {
    title: i18n.translate('dashboard.listing.tabs.dashboards.title', {
      defaultMessage: 'Dashboards',
    }),
    id: TAB_IDS.DASHBOARDS,
    getTableList: (parentProps) => (
      <DashboardsTabContent {...commonProps} parentProps={parentProps} />
    ),
  };

  const visualizationsTab: TableListTab<UserContentCommonSchema> = {
    title: i18n.translate('dashboard.listing.tabs.visualizations.title', {
      defaultMessage: 'Visualizations',
    }),
    id: TAB_IDS.VISUALIZATIONS,
    getTableList: (parentProps) => (
      <VisualizationsTabContent {...commonProps} parentProps={parentProps} />
    ),
  };

  // Additional tabs from registry (e.g., annotation groups from Event Annotation Listing plugin)
  const registryTabs = listingViewRegistry
    ? Array.from(listingViewRegistry as Set<TableListTab>)
    : [];

  return [dashboardsTab, visualizationsTab, ...registryTabs];
};
