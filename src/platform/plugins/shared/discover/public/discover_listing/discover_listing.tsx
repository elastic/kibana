/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback } from 'react';

import { FavoritesClient } from '@kbn/content-management-favorites-public';
import { TableListView } from '@kbn/content-management-table-list-view';
import { TableListViewKibanaProvider } from '@kbn/content-management-table-list-view-table';
import {
  RecentlyAccessedItemsPanel,
  useRecentlyAccessedItems,
} from '@kbn/content-management-table-list-view-common';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { FormattedRelative, I18nProvider } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { QueryClientProvider } from '@tanstack/react-query';

import { DISCOVER_APP_ID } from '@kbn/deeplinks-analytics';
import { DISCOVER_CONTENT_ID } from '../utils/telemetry_constants';
import { useDiscoverServices } from '../hooks/use_discover_services';
import { discoverQueryClient } from './discover_query_client';
import { useDiscoverListingTable } from './hooks';
import { setBreadcrumbs } from '../utils/breadcrumbs';
import type { DiscoverSavedObjectUserContent } from './types';

export const DiscoverListing = () => {
  const services = useDiscoverServices();
  const { executionContext, favoritesPoc, http, userProfile, application } = services;

  useExecutionContext(executionContext, {
    type: 'application',
    page: 'list',
  });

  const { tableListViewTableProps, hasInitialFetchReturned, pageDataTestSubject } =
    useDiscoverListingTable();

  // Get recently accessed items (filtered for Discover)
  const {
    items: recentlyAccessedItems,
    isLoading: isLoadingRecentlyAccessed,
    error: recentlyAccessedError,
  } = useRecentlyAccessedItems(services.chrome.recentlyAccessed, {
    limit: 10,
    filter: 'discover',
  });

  // Handle recently accessed item selection
  const handleRecentlyAccessedItemSelect = useCallback(
    (itemId: string, link: string) => {
      // For Discover items, use the locator to generate the proper URL
      if (link.includes('/app/discover')) {
        const properUrl = services.locator.getRedirectUrl({ savedSearchId: itemId });
        application.navigateToUrl(properUrl);
      } else {
        // For other items, use the stored link as-is
        application.navigateToUrl(link);
      }
    },
    [application, services.locator]
  );

  // Use our FavoritesService if available, otherwise fall back to FavoritesClient
  const discoverFavoritesClient = useMemo(() => {
    if (favoritesPoc?.favoritesService) {
      // Use our enhanced service
      return favoritesPoc.favoritesService.configureForApp(DISCOVER_APP_ID, DISCOVER_CONTENT_ID);
    } else {
      // Fall back to the original FavoritesClient
      return new FavoritesClient(DISCOVER_APP_ID, DISCOVER_CONTENT_ID, {
        http,
        userProfile,
      });
    }
  }, [favoritesPoc, http, userProfile]);

  // Extract title for the page header
  const { title } = tableListViewTableProps;

  // Set breadcrumbs for the Discover listing page
  React.useEffect(() => {
    setBreadcrumbs({ services });
  }, [services]);

  return (
    <I18nProvider>
      <QueryClientProvider client={discoverQueryClient}>
        <KibanaPageTemplate panelled data-test-subj={pageDataTestSubject}>
          <KibanaPageTemplate.Header
            pageTitle={<span id={tableListViewTableProps.headingId}>{title}</span>}
            data-test-subj="top-nav"
          />
          <KibanaPageTemplate.Section
            aria-labelledby={
              hasInitialFetchReturned ? tableListViewTableProps.headingId : undefined
            }
          >
            <EuiFlexGroup>
              <EuiFlexItem>
                <TableListViewKibanaProvider
                  {...{
                    core: services.core,
                    savedObjectsTagging: services.savedObjectsTagging,
                    FormattedRelative,
                    favorites: discoverFavoritesClient,
                    contentInsightsClient: undefined, // TODO: Add content insights if needed
                    isKibanaVersioningEnabled: true,
                  }}
                >
                  <TableListView<DiscoverSavedObjectUserContent> {...tableListViewTableProps} />
                </TableListViewKibanaProvider>
              </EuiFlexItem>
              <EuiFlexItem style={{ height: '100%' }} grow={false}>
                <RecentlyAccessedItemsPanel
                  items={recentlyAccessedItems}
                  isLoading={isLoadingRecentlyAccessed}
                  error={recentlyAccessedError}
                  onItemSelect={handleRecentlyAccessedItemSelect}
                  title="Recently viewed"
                  data-test-subj="discoverRecentlyAccessedItems"
                  filter="discover"
                  width={320}
                  maxWidth={400}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </KibanaPageTemplate.Section>
        </KibanaPageTemplate>
      </QueryClientProvider>
    </I18nProvider>
  );
};
