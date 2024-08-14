/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FormattedRelative, I18nProvider } from '@kbn/i18n-react';
import React, { useMemo } from 'react';

import { TableListView } from '@kbn/content-management-table-list-view';
import {
  type TableListViewKibanaDependencies,
  TableListViewKibanaProvider,
} from '@kbn/content-management-table-list-view-table';

import { useExecutionContext } from '@kbn/kibana-react-plugin/public';

import { pluginServices } from '../services/plugin_services';

import { DashboardUnsavedListing } from './dashboard_unsaved_listing';
import { useDashboardListingTable } from './hooks/use_dashboard_listing_table';
import {
  DashboardListingProps,
  DashboardSavedObjectUserContent,
  TableListViewApplicationService,
} from './types';

export const DashboardListing = ({
  children,
  initialFilter,
  goToDashboard,
  getDashboardUrl,
  useSessionStorageIntegration,
}: DashboardListingProps) => {
  const {
    analytics,
    application,
    notifications,
    overlays,
    http,
    i18n,
    chrome: { theme },
    savedObjectsTagging,
    coreContext: { executionContext },
    userProfile,
    dashboardFavorites,
  } = pluginServices.getServices();

  useExecutionContext(executionContext, {
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

  const savedObjectsTaggingFakePlugin = useMemo(() => {
    return savedObjectsTagging.hasApi // TODO: clean up this logic once https://github.com/elastic/kibana/issues/140433 is resolved
      ? ({
          ui: savedObjectsTagging,
        } as TableListViewKibanaDependencies['savedObjectsTagging'])
      : undefined;
  }, [savedObjectsTagging]);

  return (
    <I18nProvider>
      <TableListViewKibanaProvider
        {...{
          core: {
            analytics,
            application: application as TableListViewApplicationService,
            notifications,
            overlays,
            http,
            i18n,
            theme,
            userProfile,
          },
          savedObjectsTagging: savedObjectsTaggingFakePlugin,
          FormattedRelative,
          favorites: dashboardFavorites,
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
