/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import {
  TableListViewKibanaProvider,
  TableListViewTable,
} from '@kbn/content-management-table-list-view-table';
import { FormattedRelative, I18nProvider } from '@kbn/i18n-react';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';

import {
  coreServices,
  savedObjectsTaggingService,
  serverlessService,
} from '../services/kibana_services';
import { DashboardUnsavedListing } from './dashboard_unsaved_listing';
import { useDashboardListingTable } from './hooks/use_dashboard_listing_table';
import { DashboardListingProps, DashboardSavedObjectUserContent } from './types';

export const DashboardListingTable = ({
  disableCreateDashboardButton,
  initialFilter,
  goToDashboard,
  getDashboardUrl,
  useSessionStorageIntegration,
  urlStateEnabled,
  showCreateDashboardButton = true,
}: DashboardListingProps) => {
  useExecutionContext(coreServices.executionContext, {
    type: 'application',
    page: 'list',
  });

  const {
    unsavedDashboardIds,
    refreshUnsavedDashboards,
    tableListViewTableProps: { title: tableCaption, ...tableListViewTable },
    contentInsightsClient,
  } = useDashboardListingTable({
    disableCreateDashboardButton,
    goToDashboard,
    getDashboardUrl,
    urlStateEnabled,
    useSessionStorageIntegration,
    initialFilter,
    showCreateDashboardButton,
  });

  return (
    <I18nProvider>
      <TableListViewKibanaProvider
        core={coreServices}
        savedObjectsTagging={savedObjectsTaggingService?.getTaggingApi()}
        FormattedRelative={FormattedRelative}
        contentInsightsClient={contentInsightsClient}
        isKibanaVersioningEnabled={!serverlessService}
      >
        <>
          <DashboardUnsavedListing
            goToDashboard={goToDashboard}
            unsavedDashboardIds={unsavedDashboardIds}
            refreshUnsavedDashboards={refreshUnsavedDashboards}
          />
          <TableListViewTable<DashboardSavedObjectUserContent>
            tableCaption={tableCaption}
            {...tableListViewTable}
          />
        </>
      </TableListViewKibanaProvider>
    </I18nProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export default DashboardListingTable;
