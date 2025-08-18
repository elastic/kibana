/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { RecentlyAccessedItemsPanel } from '@kbn/content-management-table-list-view-common';
import { getServices } from '../kibana_services';
import { useRecentlyAccessedPanel } from './hooks';
import { FavoritesPanel } from './favorites_panel';

export const HomeContentPanels: React.FC = () => {
  const services = getServices();

  // Get recently accessed items (all types)
  const {
    items: recentlyAccessedItems,
    isLoading: isLoadingRecentlyAccessed,
    error: recentlyAccessedError,
  } = useRecentlyAccessedPanel({
    limit: 10,
    filter: 'all',
  });

  const handleRecentlyAccessedItemSelect = (itemId: string, link: string) => {
    // Handle dashboard URLs by using the application service
    if (link.includes('/app/dashboard') || link.includes('/app/dashboards')) {
      // Extract the dashboard ID from the URL
      const dashboardIdMatch = link.match(/\/view\/([^?#]+)/);
      if (dashboardIdMatch) {
        const dashboardId = dashboardIdMatch[1];
        services.application.navigateToApp('dashboards', {
          path: `#/view/${dashboardId}`,
        });
        return;
      }
    }

    // Handle Discover URLs by using the application service
    if (link.includes('/app/discover')) {
      // Extract the saved search ID from the URL
      const discoverIdMatch = link.match(/\/view\/([^?#]+)/);
      if (discoverIdMatch) {
        const savedSearchId = discoverIdMatch[1];
        services.application.navigateToApp('discover', {
          path: `#/view/${savedSearchId}`,
        });
        return;
      }
    }

    // For other items, use the stored link as-is
    services.application.navigateToUrl(link);
  };

  return (
    <>
      <EuiFlexGroup justifyContent="flexStart">
        <EuiFlexItem style={{ maxWidth: '400px' }}>
          <FavoritesPanel />
        </EuiFlexItem>
        <EuiFlexItem style={{ maxWidth: '400px' }}>
          <RecentlyAccessedItemsPanel
            items={recentlyAccessedItems}
            isLoading={isLoadingRecentlyAccessed}
            error={recentlyAccessedError}
            onItemSelect={handleRecentlyAccessedItemSelect}
            title="Recently accessed"
            data-test-subj="homeRecentlyAccessedItems"
            filter="all"
            color="plain"
            hasBorder
            paddingSize="m"
            // width={320}
            // maxWidth={400}
          />
        </EuiFlexItem>
        {/* TODO: Add TaggedItemsPanel */}
      </EuiFlexGroup>
      <EuiSpacer size="l" />
    </>
  );
};
