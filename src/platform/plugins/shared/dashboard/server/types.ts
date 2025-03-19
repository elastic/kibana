/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DashboardPluginSetup {}
export interface DashboardPluginStart {
  /**
   * Use contentClient.getForRequest to get a scoped client to perform CRUD and search operations for dashboards using the methods available in the {@link DashboardStorage} class.
   *
   * @example
   * Get a dashboard client for the current request
   * ```ts
   * // dashboardClient is scoped to the current user
   * // specifying the version is recommended to return a consistent result
   * const dashboardClient = plugins.dashboard.contentClient.getForRequest({ requestHandlerContext, request, version: 3 });
   *
   * const { search, create, update, delete: deleteDashboard } = dashboardClient;
   * ```
   *
   * @example
   * Search using {@link DashboardStorage#search}
   * ```ts
   * const dashboardList = await search({ text: 'my dashboard' }, { spaces: ['default'] } });
   * ```
   * @example
   * Create a new dashboard using {@link DashboardCreateIn}
   * ```ts
   * const newDashboard = await create({ attributes: { title: 'My Dashboard' } });
   * ```
   *
   * @example
   * Update an existing dashboard using {@link DashboardUpdateIn}
   * ```ts
   * const updatedDashboard = await update({ id: 'dashboard-id', attributes: { title: 'My Updated Dashboard' } });
   * ```
   *
   * @example
   * Delete an existing dashboard using {@link DashboardDeleteIn}
   * ```ts
   * deleteDashboard({ id: 'dashboard-id' });
   * ```
   */
  contentClient?: ReturnType<ContentManagementServerSetup['register']>['contentClient'];
}
