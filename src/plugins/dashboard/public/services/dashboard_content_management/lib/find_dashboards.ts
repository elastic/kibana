/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import { SavedObjectError, SavedObjectsFindOptionsReference } from '@kbn/core/public';

import type {
  DashboardAttributes,
  DashboardGetIn,
  DashboardGetOut,
  DashboardSearchIn,
  DashboardSearchOut,
  DashboardSearchOptions,
  DashboardItem,
} from '../../../../server/content_management';
import { DASHBOARD_CONTENT_ID } from '../../../dashboard_constants';
import { DashboardStartDependencies } from '../../../plugin';
import { dashboardContentManagementCache } from '../dashboard_content_management_service';

export interface SearchDashboardsArgs {
  contentManagement: DashboardStartDependencies['contentManagement'];
  options?: DashboardSearchOptions;
  hasNoReference?: SavedObjectsFindOptionsReference[];
  hasReference?: SavedObjectsFindOptionsReference[];
  search: string;
  size: number;
}

export interface SearchDashboardsResponse {
  total: number;
  hits: DashboardItem[];
}

export async function searchDashboards({
  contentManagement,
  hasNoReference,
  hasReference,
  options,
  search,
  size,
}: SearchDashboardsArgs): Promise<SearchDashboardsResponse> {
  const {
    hits,
    pagination: { total },
  } = await contentManagement.client.search<DashboardSearchIn, DashboardSearchOut>({
    contentTypeId: DASHBOARD_CONTENT_ID,
    query: {
      text: search ? `${search}*` : undefined,
      limit: size,
      tags: {
        included: (hasReference ?? []).map(({ id }) => id),
        excluded: (hasNoReference ?? []).map(({ id }) => id),
      },
    },
    options,
  });
  return {
    total,
    hits,
  };
}

export type FindDashboardsByIdResponse = { id: string } & (
  | { status: 'success'; attributes: DashboardAttributes; references: Reference[] }
  | { status: 'error'; error: SavedObjectError }
);

export async function findDashboardById(
  contentManagement: DashboardStartDependencies['contentManagement'],
  id: string
): Promise<FindDashboardsByIdResponse> {
  /** If the dashboard exists in the cache, then return the result from that */
  const cachedDashboard = dashboardContentManagementCache.fetchDashboard(id);
  if (cachedDashboard) {
    return {
      id,
      status: 'success',
      attributes: cachedDashboard.item.attributes,
      references: cachedDashboard.item.references,
    };
  }

  /** Otherwise, fetch the dashboard from the content management client, add it to the cache, and return the result */
  try {
    const response = await contentManagement.client.get<DashboardGetIn, DashboardGetOut>({
      contentTypeId: DASHBOARD_CONTENT_ID,
      id,
    });
    if (response.item.error) {
      throw response.item.error;
    }

    dashboardContentManagementCache.addDashboard(response);
    return {
      id,
      status: 'success',
      attributes: response.item.attributes,
      references: response.item.references,
    };
  } catch (e) {
    return {
      status: 'error',
      error: e.body || e.message,
      id,
    };
  }
}

export async function findDashboardsByIds(
  contentManagement: DashboardStartDependencies['contentManagement'],
  ids: string[]
): Promise<FindDashboardsByIdResponse[]> {
  const findPromises = ids.map((id) => findDashboardById(contentManagement, id));
  const results = await Promise.all(findPromises);
  return results as FindDashboardsByIdResponse[];
}

export async function findDashboardIdByTitle(
  contentManagement: DashboardStartDependencies['contentManagement'],
  title: string
): Promise<{ id: string } | undefined> {
  const { hits } = await contentManagement.client.search<DashboardSearchIn, DashboardSearchOut>({
    contentTypeId: DASHBOARD_CONTENT_ID,
    query: {
      text: title ? `${title}*` : undefined,
      limit: 10,
    },
    options: { onlyTitle: true },
  });
  // The search isn't an exact match, lets see if we can find a single exact match to use
  const matchingDashboards = hits.filter(
    (hit) => hit.attributes.title.toLowerCase() === title.toLowerCase()
  );
  if (matchingDashboards.length === 1) {
    return { id: matchingDashboards[0].id };
  }
}
