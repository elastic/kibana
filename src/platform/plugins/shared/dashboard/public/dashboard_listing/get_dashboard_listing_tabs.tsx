/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
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
import type { ViewMode } from '@kbn/presentation-publishing';
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
import type { DashboardListingUserContent } from './types';
import type { DashboardListingViewRegistry } from '../plugin';

interface GetDashboardListingTabsParams {
  goToDashboard: (dashboardId?: string, viewMode?: ViewMode) => void;
  getDashboardUrl: (dashboardId: string, usesTimeRestore: boolean) => string;
  useSessionStorageIntegration?: boolean;
  initialFilter?: string;
  listingViewRegistry: DashboardListingViewRegistry;
}

export const getDashboardListingTabs = ({
  goToDashboard,
  getDashboardUrl,
  useSessionStorageIntegration,
  initialFilter,
  listingViewRegistry,
}: GetDashboardListingTabsParams): TableListTab<DashboardListingUserContent>[] => {
  const dashboardsTab: TableListTab<DashboardListingUserContent> = {
    title: 'Dashboards',
    id: 'dashboards',
    getTableList: (parentProps: TableListTabParentProps<DashboardListingUserContent>) => {
      const DashboardsTabContent = () => {
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
          contentTypeFilter: 'dashboards',
          ...parentProps,
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
            {...{
              core: coreServices,
              savedObjectsTagging: savedObjectsTaggingService?.getTaggingApi(),
              FormattedRelative,
              favorites: dashboardFavoritesClient,
              contentInsightsClient,
              isKibanaVersioningEnabled: !serverlessService,
            }}
          >
            <DashboardUnsavedListing
              goToDashboard={goToDashboard}
              unsavedDashboardIds={unsavedDashboardIds}
              refreshUnsavedDashboards={refreshUnsavedDashboards}
            />
            <TableListViewTable<DashboardListingUserContent>
              tableCaption={tableListViewTableProps.title}
              {...tableListViewTableProps}
              {...parentProps}
            />
          </TableListViewKibanaProvider>
        );
      };

      return <DashboardsTabContent />;
    },
  };

  const visualizationsTab: TableListTab<DashboardListingUserContent> = {
    title: 'Visualizations',
    id: 'visualizations',
    getTableList: (parentProps: TableListTabParentProps<DashboardListingUserContent>) => {
      const VisualizationsTabContent = () => {
        const { tableListViewTableProps, contentInsightsClient } = useDashboardListingTable({
          goToDashboard,
          getDashboardUrl,
          useSessionStorageIntegration,
          initialFilter,
          contentTypeFilter: 'visualizations',
          ...parentProps,
        });

        return (
          <TableListViewKibanaProvider
            {...{
              core: coreServices,
              savedObjectsTagging: savedObjectsTaggingService?.getTaggingApi(),
              FormattedRelative,
              contentInsightsClient,
              isKibanaVersioningEnabled: !serverlessService,
            }}
          >
            <TableListViewTable<DashboardListingUserContent>
              tableCaption={tableListViewTableProps.title}
              {...tableListViewTableProps}
              {...parentProps}
            />
          </TableListViewKibanaProvider>
        );
      };

      return <VisualizationsTabContent />;
    },
  };

  // Additional tabs from registry (e.g., annotation groups from Event Annotation Listing plugin)
  const registryTabs = Array.from(listingViewRegistry as Set<TableListTab>);

  return [dashboardsTab, visualizationsTab, ...registryTabs];
};
