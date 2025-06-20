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
  FavoritesClient,
  FavoritesContextProvider,
} from '@kbn/content-management-favorites-public';
import { QueryClientProvider } from '@tanstack/react-query';
import { DASHBOARD_APP_ID } from '../../common/constants';
import { DASHBOARD_CONTENT_ID } from '../utils/telemetry_constants';
import { coreServices, usageCollectionService } from '../services/kibana_services';
import { dashboardQueryClient } from '../services/dashboard_query_client';

export const DashboardFavoriteButton = ({ dashboardId }: { dashboardId?: string }) => {
  const dashboardFavoritesClient = useMemo(() => {
    return new FavoritesClient(DASHBOARD_APP_ID, DASHBOARD_CONTENT_ID, {
      http: coreServices.http,
      userProfile: coreServices.userProfile,
      usageCollection: usageCollectionService,
    });
  }, []);

  return (
    <QueryClientProvider client={dashboardQueryClient}>
      <FavoritesContextProvider favoritesClient={dashboardFavoritesClient}>
        {dashboardId && <FavoriteButton id={dashboardId} />}
      </FavoritesContextProvider>
    </QueryClientProvider>
  );
};
