/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import {
  FavoriteButton,
  FavoritesContextProvider,
} from '@kbn/content-management-favorites-public';
import { QueryClientProvider } from '@kbn/react-query';
import { createDashboardFavoritesClient } from '../dashboard_navigation/fetch_starred_dashboards';
import { dashboardQueryClient } from '../services/dashboard_query_client';
import { coreServices } from '../services/kibana_services';

export const DashboardFavoriteButton = ({ dashboardId }: { dashboardId?: string }) => {
  const dashboardFavoritesClient = useMemo(
    () => createDashboardFavoritesClient(coreServices),
    []
  );

  return (
    <QueryClientProvider client={dashboardQueryClient}>
      <FavoritesContextProvider favoritesClient={dashboardFavoritesClient}>
        {dashboardId && <FavoriteButton id={dashboardId} />}
      </FavoritesContextProvider>
    </QueryClientProvider>
  );
};
