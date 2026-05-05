/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { KibanaContentListPage } from '@kbn/content-list-page';

import { coreServices } from '../services/kibana_services';
import { DashboardListingContent, DashboardListingProviders } from './content';
import { ExternalTab } from './external_tab';
import { useDashboardListingTable } from './hooks/use_dashboard_listing_table';
import { useDashboardListingTabs } from './hooks/use_dashboard_listing_tabs';
import type { DashboardListingProps } from './types';

const dashboardsLabel = i18n.translate('dashboard.listing.title', {
  defaultMessage: 'Dashboards',
});

/**
 * Dashboard listing page.
 *
 * Thin shell around {@link DashboardListingPage} that mounts the dashboard
 * provider stack (`I18nProvider`, `QueryClientProvider`,
 * `ContentEditorKibanaProvider`). The inner page component owns hook
 * wiring, tab routing, and chrome.
 */
export const DashboardListing = ({ children, ...pageProps }: DashboardListingProps) => (
  <DashboardListingProviders withQueryClient>
    {children}
    <DashboardListingPage {...pageProps} />
  </DashboardListingProviders>
);

/**
 * Internal page body for {@link DashboardListing}.
 *
 * Owns tab routing, header (title / tabs / create-button), and the
 * branch between the dashboards content and any externally-registered
 * tabs (visualizations, annotation groups).
 */
const DashboardListingPage = ({
  initialFilter,
  goToDashboard,
  getDashboardUrl,
  useSessionStorageIntegration,
  getTabs,
}: Omit<DashboardListingProps, 'children'>) => {
  useExecutionContext(coreServices.executionContext, {
    type: 'application',
    page: 'list',
  });

  const { activeTabId, externalTabs, headerTabs, isDashboardsTab } = useDashboardListingTabs({
    getTabs,
    dashboardsLabel,
  });

  const bundle = useDashboardListingTable({
    id: 'dashboard-listing',
    goToDashboard,
    getDashboardUrl,
    useSessionStorageIntegration,
    initialFilter,
  });

  const headerActions =
    isDashboardsTab && bundle.createItem ? (
      <EuiButton
        fill
        iconType="plusInCircle"
        onClick={bundle.createItem}
        data-test-subj="newItemButton"
      >
        <FormattedMessage
          id="dashboard.listing.createDashboardButtonLabel"
          defaultMessage="Create dashboard"
        />
      </EuiButton>
    ) : undefined;

  return (
    <KibanaContentListPage headingId="dashboardListingHeading">
      <KibanaContentListPage.Header
        title={dashboardsLabel}
        tabs={headerTabs}
        actions={headerActions}
      />
      <KibanaContentListPage.Section>
        {isDashboardsTab ? (
          <DashboardListingContent {...{ bundle, goToDashboard }} />
        ) : (
          <ExternalTab tab={externalTabs.find((tab) => tab.id === activeTabId)!} />
        )}
      </KibanaContentListPage.Section>
    </KibanaContentListPage>
  );
};

// eslint-disable-next-line import/no-default-export
export default DashboardListing;
