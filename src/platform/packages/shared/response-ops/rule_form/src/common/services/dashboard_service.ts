/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { DashboardAttributes } from '@kbn/dashboard-plugin/server';

export interface DashboardItem {
  id: string;
  attributes: Pick<DashboardAttributes, 'title'>;
}

export type DashboardService = ReturnType<typeof dashboardServiceProvider>;
export type DashboardItems = Awaited<ReturnType<DashboardService['fetchDashboards']>>;

export function dashboardServiceProvider(dashboardService: DashboardStart) {
  return {
    /**
     * Fetch dashboards
     * @param query - The query to search for dashboards
     * @returns - The dashboards that match the query
     */
    async fetchDashboards(query?: string): Promise<DashboardItem[]> {
      const findDashboardsService = await dashboardService.findDashboardsService();
      const responses = await findDashboardsService.search({
        search: query ? `${query}*` : '',
        size: 1000,
        options: { spaces: ['*'], fields: ['title', 'description'] },
      });
      return responses.hits;
    },
    /**
     * Fetch dashboard by id
     * @param id - The id of the dashboard to fetch
     * @returns - The dashboard with the given id
     * @throws - An error if the dashboard does not exist
     */
    async fetchDashboard(id: string) {
      const findDashboardsService = await dashboardService.findDashboardsService();
      const response = await findDashboardsService.findById(id);
      if (response.status === 'error') {
        throw new Error(response.error.message);
      }
      return response;
    },
    /**
     * Fetch only the dashboards that still exist
     * @param ids - The ids of the dashboards to fetch
     * @returns - The dashboards that exist
     */
    async fetchValidDashboards(ids: string[]) {
      const findDashboardsService = await dashboardService.findDashboardsService();
      const responses = await findDashboardsService.findByIds(ids);
      const existingDashboards = responses.filter(({ status }) => status === 'success');
      return existingDashboards;
    },
  };
}
