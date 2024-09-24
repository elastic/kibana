/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { FavoritesClient } from '@kbn/content-management-favorites-public';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { DashboardFavoritesService } from './types';

export type DashboardFavoritesServiceFactory = PluginServiceFactory<DashboardFavoritesService>;

export const dashboardFavoritesServiceFactory: DashboardFavoritesServiceFactory = () => {
  return new FavoritesClient('dashboards', 'dashboard', {
    http: httpServiceMock.createStartContract(),
  });
};
