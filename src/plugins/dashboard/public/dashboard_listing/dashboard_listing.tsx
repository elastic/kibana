/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { TableListView } from '@kbn/content-management-table-list-view';
import { TableListViewKibanaProvider } from '@kbn/content-management-table-list-view-table';
import { FormattedRelative, I18nProvider } from '@kbn/i18n-react';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';

import { coreServices, savedObjectsTaggingService } from '../services/kibana_services';
import { pluginServices } from '../services/plugin_services';
import { DashboardUnsavedListing } from './dashboard_unsaved_listing';
import { useDashboardListingTable } from './hooks/use_dashboard_listing_table';
import { DashboardListingProps, DashboardSavedObjectUserContent } from './types';
import { favoritesService } from '../services/dashboard_services';

export const DashboardListing = ({
  children,
  initialFilter,
  goToDashboard,
  getDashboardUrl,
  useSessionStorageIntegration,
}: DashboardListingProps) => {
  const {
    dashboardContentInsights: { contentInsightsClient },
  } = pluginServices.getServices();

  useExecutionContext(coreServices.executionContext, {
    type: 'application',
    page: 'list',
  });

  const { unsavedDashboardIds, refreshUnsavedDashboards, tableListViewTableProps } =
    useDashboardListingTable({
      goToDashboard,
      getDashboardUrl,
      useSessionStorageIntegration,
      initialFilter,
    });

  return (
    <I18nProvider>
      <TableListViewKibanaProvider
        {...{
          core: coreServices,
          savedObjectsTagging: savedObjectsTaggingService?.getTaggingApi(),
          FormattedRelative,
          favorites: favoritesService,
          contentInsightsClient,
        }}
      >
        <TableListView<DashboardSavedObjectUserContent> {...tableListViewTableProps}>
          <>
            {children}
            <DashboardUnsavedListing
              goToDashboard={goToDashboard}
              unsavedDashboardIds={unsavedDashboardIds}
              refreshUnsavedDashboards={refreshUnsavedDashboards}
            />
          </>
        </TableListView>
      </TableListViewKibanaProvider>
    </I18nProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export default DashboardListing;
