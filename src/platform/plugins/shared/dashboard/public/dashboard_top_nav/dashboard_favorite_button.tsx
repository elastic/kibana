/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, type ReactNode } from 'react';
import {
  FavoriteButton,
  FavoritesClient,
  FavoritesContextProvider,
  useFavorite,
} from '@kbn/content-management-favorites-public';
import { QueryClientProvider } from '@kbn/react-query';
import { DASHBOARD_APP_ID } from '../../common/page_bundle_constants';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../common/constants';
import { coreServices, usageCollectionService } from '../services/kibana_services';
import { dashboardQueryClient } from '../services/dashboard_query_client';

const useDashboardFavoritesClient = () => {
  return useMemo(() => {
    return new FavoritesClient(DASHBOARD_APP_ID, DASHBOARD_SAVED_OBJECT_TYPE, {
      http: coreServices.http,
      userProfile: coreServices.userProfile,
      usageCollection: usageCollectionService,
    });
  }, []);
};

/**
 * Provides favorites client + query context for dashboard favorite UI.
 * Required around any component that calls `useFavorite`.
 */
export const DashboardFavoritesProvider = ({ children }: { children: ReactNode }) => {
  const dashboardFavoritesClient = useDashboardFavoritesClient();

  return (
    <QueryClientProvider client={dashboardQueryClient}>
      <FavoritesContextProvider favoritesClient={dashboardFavoritesClient}>
        {children}
      </FavoritesContextProvider>
    </QueryClientProvider>
  );
};

export { useFavorite };

/** Legacy chrome breadcrumbs append: self-contained favorite button with its own providers. */
export const DashboardFavoriteButton = ({ dashboardId }: { dashboardId?: string }) => {
  return (
    <DashboardFavoritesProvider>
      {dashboardId ? <FavoriteButton id={dashboardId} /> : null}
    </DashboardFavoritesProvider>
  );
};
