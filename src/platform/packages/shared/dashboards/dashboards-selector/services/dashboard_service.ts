/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UiActionsPublicStart } from '@kbn/ui-actions-plugin/public';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';

export interface DashboardItem {
  id: string;
  attributes: {
    title: string;
    description?: string;
  };
}

interface DashboardSearchResult {
  id: string;
  isManaged: boolean;
  title: string;
}

export type DashboardService = ReturnType<typeof dashboardServiceProvider>;
export type DashboardItems = Awaited<ReturnType<DashboardService['fetchDashboards']>>;

export function dashboardServiceProvider(uiActions: UiActionsPublicStart) {
  return {
    /**
     * Fetch dashboards using the searchDashboardAction UI action
     * @param search - Optional search string to filter dashboards
     * @param limit - Maximum number of dashboards to return
     * @returns - The dashboards that match the query
     */
    async fetchDashboards({
      search,
      limit = 100,
    }: { search?: string; limit?: number } = {}): Promise<DashboardItem[]> {
      try {
        const searchAction = await uiActions.getAction('searchDashboardAction');
        return new Promise<DashboardItem[]>((resolve, reject) => {
          searchAction.execute({
            onResults(dashboards: DashboardSearchResult[]) {
              // Transform the dashboard search results to DashboardItem format
              const items: DashboardItem[] = dashboards.map((dashboard) => ({
                id: dashboard.id,
                attributes: {
                  title: dashboard.title,
                },
              }));
              resolve(items);
            },
            search: {
              search,
              per_page: limit,
            },
            trigger: { id: 'searchDashboards' },
          } as ActionExecutionContext);
        });
      } catch (error) {
        console.error('Error fetching dashboards:', error);
        return [];
      }
    },
    /**
     * Fetch dashboard by id using the searchDashboardAction
     * @param id - The id of the dashboard to fetch
     * @returns - The dashboard with the given id
     */
    async fetchDashboard(id: string): Promise<DashboardItem | null> {
      try {
        // Search for dashboards and find the one with matching id
        const dashboards = await this.fetchDashboards({ limit: 1000 });
        const dashboard = dashboards.find((d) => d.id === id);
        return dashboard || null;
      } catch (error) {
        console.error('Error fetching dashboard:', error);
        return null;
      }
    },

    async fetchDashboardsByIds(ids: string[]): Promise<DashboardItem[]> {
      const dashboards = await this.fetchDashboards({ limit: 1000 });
      return dashboards.filter((dashboard) => ids.includes(dashboard.id));
    },
    /**
     * Fetch only the dashboards that still exist
     * @param ids - The ids of the dashboards to fetch
     * @returns - The dashboards that exist
     */
    async fetchValidDashboards(ids: string[]): Promise<DashboardItem[]> {
      return this.fetchDashboardsByIds(ids);
    },
  };
}
