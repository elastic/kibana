/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { I18nProvider } from '@kbn/i18n-react';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';

import { ContentListClientProvider } from '@kbn/content-list-provider-client';
import { coreServices } from '../services/kibana_services';
import { useDashboardListingTable } from './hooks/use_dashboard_listing_table';
import type { DashboardListingProps } from './types';
import { DashboardContentList } from './dashboard_content_list';

export const DashboardListingTable = ({
  disableCreateDashboardButton,
  initialFilter,
  goToDashboard,
  getDashboardUrl,
  useSessionStorageIntegration,
  urlStateEnabled,
}: DashboardListingProps) => {
  useExecutionContext(coreServices.executionContext, {
    type: 'application',
    page: 'list',
  });

  const { contentListProviderProps, emptyState, unsavedDashboardIds, refreshUnsavedDashboards } =
    useDashboardListingTable({
      disableCreateDashboardButton,
      goToDashboard,
      getDashboardUrl,
      urlStateEnabled,
      useSessionStorageIntegration,
      initialFilter,
    });

  return (
    <I18nProvider>
      <ContentListClientProvider {...contentListProviderProps}>
        <DashboardContentList
          emptyState={emptyState}
          goToDashboard={goToDashboard}
          unsavedDashboardIds={unsavedDashboardIds}
          refreshUnsavedDashboards={refreshUnsavedDashboards}
        />
      </ContentListClientProvider>
    </I18nProvider>
  );
};
