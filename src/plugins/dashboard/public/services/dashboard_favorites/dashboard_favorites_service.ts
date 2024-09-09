/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FavoritesClient } from '@kbn/content-management-favorites-public';
import { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { DashboardStartDependencies } from '../../plugin';
import { DashboardFavoritesService } from './types';
import { DASHBOARD_APP_ID, DASHBOARD_CONTENT_ID } from '../../dashboard_constants';

export type DashboardFavoritesServiceFactory = KibanaPluginServiceFactory<
  DashboardFavoritesService,
  DashboardStartDependencies
>;

export const dashboardFavoritesServiceFactory: DashboardFavoritesServiceFactory = ({
  coreStart,
  startPlugins,
}) => {
  return new FavoritesClient(DASHBOARD_APP_ID, DASHBOARD_CONTENT_ID, {
    http: coreStart.http,
    usageCollection: startPlugins.usageCollection,
  });
};
