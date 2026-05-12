/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { saveServiceDashboardRoute } from './save_service_dashboard';
import { getServiceDashboardsRoute } from './get_service_dashboards';
import { deleteServiceDashboardRoute } from './delete_service_dashboard';

export const customDashboardsRouteDefinitions = {
  saveServiceDashboard: saveServiceDashboardRoute,
  getServiceDashboards: getServiceDashboardsRoute,
  deleteServiceDashboard: deleteServiceDashboardRoute,
};

export type { SaveServiceDashboardResponse } from './save_service_dashboard';
export type { GetServiceDashboardsResponse } from './get_service_dashboards';
