/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SearchQuery } from '@kbn/content-management-plugin/common';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { Reference, ContentManagementCrudTypes } from '@kbn/content-management-utils';
import type { SavedObjectError } from '@kbn/core/public';
import type { GetIn } from '@kbn/content-management-plugin/common';

const DASHBOARD_CONTENT_TYPE_ID = 'dashboard';
export type DashboardGetIn = GetIn<typeof DASHBOARD_CONTENT_TYPE_ID>;

export type FindDashboardsByIdResponse = { id: string } & (
  | { status: 'success'; attributes: any; references: Reference[] }
  | { status: 'error'; error: SavedObjectError }
);

export interface DashboardItem {
  id: string;
  attributes: any; // DashboardAttributes is exported in the Dashboard plugin and this causes a cycle dependency. Get feedback on the best approach here
}

export type DashboardService = ReturnType<typeof dashboardServiceProvider>;
export type DashboardItems = Awaited<ReturnType<DashboardService['fetchDashboards']>>;

export function dashboardServiceProvider(contentManagementService: ContentManagementPublicStart) {
  return {
    /**
     * Fetch dashboards
     * @param query - The query to search for dashboards
     * @returns - The dashboards that match the query
     */
    async fetchDashboards(query: SearchQuery = {}): Promise<DashboardItem[]> {
      const response = await contentManagementService.client.search({
        contentTypeId: 'dashboard',
        query,
        options: { fields: ['title', 'description'], includeReferences: ['tag'] },
      });

      // Assert the type of response to access hits property
      return (response as { hits: DashboardItem[] }).hits;
    },
    /**
     * Fetch dashboard by id
     * @param id - The id of the dashboard to fetch
     * @returns - The dashboard with the given id
     * @throws - An error if the dashboard does not exist
     */
    async fetchDashboard(id: string): Promise<FindDashboardsByIdResponse> {
      try {
        const response = await contentManagementService.client.get<
          DashboardGetIn,
          ContentManagementCrudTypes<
            typeof DASHBOARD_CONTENT_TYPE_ID,
            any,
            object,
            object,
            object
          >['GetOut']
        >({
          contentTypeId: 'dashboard',
          id,
        });
        if (response.item.error) {
          throw response.item.error;
        }

        return {
          id,
          status: 'success',
          attributes: response.item.attributes,
          references: response.item.references,
        };
      } catch (error) {
        return {
          status: 'error',
          error: error.body || error.message,
          id,
        };
      }
    },

    async fetchDashboardsByIds(ids: string[]) {
      const findPromises = ids.map((id) => this.fetchDashboard(id));
      const results = await Promise.all(findPromises);
      return results as FindDashboardsByIdResponse[];
    },
    /**
     * Fetch only the dashboards that still exist
     * @param ids - The ids of the dashboards to fetch
     * @returns - The dashboards that exist
     */
    async fetchValidDashboards(ids: string[]) {
      const responses = await this.fetchDashboardsByIds(ids);
      const existingDashboards = responses.filter(({ status }) => status === 'success');
      return existingDashboards;
    },
  };
}
