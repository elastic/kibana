/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';

import { FavoritesClient } from '@kbn/content-management-favorites-public';
import { TableListView } from '@kbn/content-management-table-list-view';
import { TableListViewKibanaProvider } from '@kbn/content-management-table-list-view-table';
import { FormattedRelative, I18nProvider } from '@kbn/i18n-react';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { QueryClientProvider } from '@tanstack/react-query';

import { DISCOVER_APP_ID } from '@kbn/deeplinks-analytics';
import { DISCOVER_CONTENT_ID } from '../utils/telemetry_constants';
import { useDiscoverServices } from '../hooks/use_discover_services';
import { discoverQueryClient } from './discover_query_client';
import { useDiscoverListingTable } from './hooks';
import type { DiscoverSavedObjectUserContent } from './types';

export const DiscoverListing = () => {
  const services = useDiscoverServices();
  const {
    executionContext,
    favoritesPoc,
    http,
    usageCollection,
    userProfile,
  } = services;

  useExecutionContext(executionContext, {
    type: 'application',
    page: 'list',
  });

  const {
    tableListViewTableProps,
  } = useDiscoverListingTable();

  // Use our FavoritesService if available, otherwise fall back to FavoritesClient
  const discoverFavoritesClient = useMemo(() => {
    if (favoritesPoc?.favoritesService) {
      // Use our enhanced service
      return favoritesPoc.favoritesService.configureForApp(
        DISCOVER_APP_ID,
        DISCOVER_CONTENT_ID
      );
    } else {
      // Fall back to the original FavoritesClient
      return new FavoritesClient(DISCOVER_APP_ID, DISCOVER_CONTENT_ID, {
        http,
        usageCollection,
        userProfile,
      });
    }
  }, [favoritesPoc, http, usageCollection, userProfile]);

  return (
    <I18nProvider>
      <QueryClientProvider client={discoverQueryClient}>
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
          <TableListView<DiscoverSavedObjectUserContent> {...tableListViewTableProps}>
            {/* TODO: Add any additional children components if needed */}
          </TableListView>
        </TableListViewKibanaProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
};
