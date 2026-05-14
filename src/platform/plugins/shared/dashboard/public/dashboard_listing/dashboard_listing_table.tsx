/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { useExecutionContext } from '@kbn/kibana-react-plugin/public';

import { coreServices } from '../services/kibana_services';
import { DashboardListingContent, DashboardListingProviders } from './content';
import { useDashboardListingTable } from './hooks/use_dashboard_listing_table';
import type { DashboardListingProps } from './types';

/**
 * Embeddable Dashboard listing — used outside the Dashboard application
 * (e.g., the Security Solution landing page).
 *
 * Thin shell around {@link DashboardListingTableContent} that mounts the
 * shared provider stack (`I18nProvider`, `ContentEditorKibanaProvider`).
 */
export const DashboardListingTable = (props: DashboardListingProps) => (
  <DashboardListingProviders>
    <DashboardListingTableContent {...props} />
  </DashboardListingProviders>
);

const DashboardListingTableContent = ({
  disableCreateDashboardButton,
  goToDashboard,
  getDashboardUrl,
  useSessionStorageIntegration,
  initialFilter,
  // Mirrors the legacy `TableListView` default (`urlStateEnabled = true`) so
  // callers who didn't opt in or out keep their previous behavior. Hosts
  // that already manage the URL (e.g. the Security landing page) pass
  // `urlStateEnabled={false}` to avoid stomping on their query string.
  urlStateEnabled = true,
  showCreateDashboardButton = true,
}: DashboardListingProps) => {
  useExecutionContext(coreServices.executionContext, {
    type: 'application',
    page: 'list',
  });

  const bundle = useDashboardListingTable({
    id: 'dashboard-listing-table',
    disableCreateDashboardButton,
    goToDashboard,
    getDashboardUrl,
    useSessionStorageIntegration,
    showCreateDashboardButton,
    initialFilter,
    urlStateEnabled,
  });

  return <DashboardListingContent {...{ bundle, goToDashboard }} />;
};
