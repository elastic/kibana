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
  FindDashboardsByIdResponseAttributes,
  DashboardGetIn,
  DashboardGetOut,
  DashboardSearchIn,
  DashboardSearchOut,
  DashboardSearchOptions,
} from '../../../../server/content_management';
import { getDashboardContentManagementCache } from '..';
import { DASHBOARD_CONTENT_ID } from '../../../utils/telemetry_constants';
import { contentManagementService } from '../../kibana_services';

export interface SearchDashboardsArgs {
  options?: DashboardSearchOptions;
  hasNoReference?: SavedObjectsFindOptionsReference[];
  hasReference?: SavedObjectsFindOptionsReference[];
  search: string;
  size: number;
}

export interface SearchDashboardsResponse {
  total: number;
  hits: DashboardSearchOut['hits'];
}

export async function searchDashboards({
  hasNoReference,
  hasReference,
  options,
  search,
  size,
}: SearchDashboardsArgs): Promise<SearchDashboardsResponse> {
  const {
    hits,
    pagination: { total },
  } = await contentManagementService.client.search<DashboardSearchIn, DashboardSearchOut>({
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
  | { status: 'success'; attributes: FindDashboardsByIdResponseAttributes; references: Reference[] }
  | { status: 'error'; error: SavedObjectError }
);

export async function findDashboardById(id: string): Promise<FindDashboardsByIdResponse> {
  const dashboardContentManagementCache = getDashboardContentManagementCache();

  /** If the dashboard exists in the cache, then return the result from that */
  const cachedDashboard = dashboardContentManagementCache.fetchDashboard(id);
  const { ...attributes } = cachedDashboard?.data;
  const references = cachedDashboard?.data.references ?? [];
  if (cachedDashboard) {
    return {
      id,
      status: 'success',
      attributes,
      references,
    };
  }

  /** Otherwise, fetch the dashboard from the content management client, add it to the cache, and return the result */
  try {
    const response = await contentManagementService.client.get<DashboardGetIn, DashboardGetOut>({
      contentTypeId: DASHBOARD_CONTENT_ID,
      id,
    });
    if ('error' in response) {
      throw response.error;
    }

    dashboardContentManagementCache.addDashboard(response);
    const {
      data: { references: responseReferences = [], ...responseAttributes },
    } = response;
    return {
      id,
      status: 'success',
      attributes: responseAttributes,
      references: responseReferences,
    };
  } catch (e) {
    return {
      status: 'error',
      error: e.body || e.message,
      id,
    };
  }
}

export async function findDashboardsByIds(ids: string[]): Promise<FindDashboardsByIdResponse[]> {
  const findPromises = ids.map((id) => findDashboardById(id));
  const results = await Promise.all(findPromises);
  return results as FindDashboardsByIdResponse[];
}

export async function findDashboardIdByTitle(title: string): Promise<{ id: string } | undefined> {
  const result = await contentManagementService.client.search<
    DashboardSearchIn,
    DashboardSearchOut
  >({
    contentTypeId: DASHBOARD_CONTENT_ID,
    query: {
      text: title ? `${title}*` : undefined,
      limit: 10,
    },
    options: { onlyTitle: true },
  });

  const { hits } = result;
  // The search isn't an exact match, lets see if we can find a single exact match to use
  const matchingDashboardIndex = hits.findIndex(
    (hit) => hit.data.title.toLowerCase() === title.toLowerCase()
  );
  if (matchingDashboardIndex >= 0) {
    return { id: hits[matchingDashboardIndex].id };
  }
}
