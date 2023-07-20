/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectError, SavedObjectsFindOptionsReference } from '@kbn/core/public';

import {
  DashboardItem,
  DashboardCrudTypes,
  DashboardAttributes,
} from '../../../../common/content_management';
import { DashboardStartDependencies } from '../../../plugin';
import { DASHBOARD_CONTENT_ID } from '../../../dashboard_constants';
import { dashboardContentManagementServiceCache } from '../dashboard_content_management_service';

export interface SearchDashboardsArgs {
  contentManagement: DashboardStartDependencies['contentManagement'];
  options?: DashboardCrudTypes['SearchIn']['options'];
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
  } = await contentManagement.client.search<
    DashboardCrudTypes['SearchIn'],
    DashboardCrudTypes['SearchOut']
  >({
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
  | { status: 'success'; attributes: DashboardAttributes }
  | { status: 'error'; error: SavedObjectError }
);

export async function findDashboardById(
  contentManagement: DashboardStartDependencies['contentManagement'],
  id: string
): Promise<FindDashboardsByIdResponse> {
  // console.log('checking cache', id, dashboardContentManagementServiceCache);
  if (
    dashboardContentManagementServiceCache[id] &&
    Math.abs(+new Date() - +dashboardContentManagementServiceCache[id].lastFetched) < 300000 // 5 minutes
  ) {
    // this dashboard already exists in the cache and the cache hasn't timed out, so just return the cached version
    // console.log('...found in cache!');
    return {
      id,
      status: 'success',
      attributes: dashboardContentManagementServiceCache[id].item.attributes,
    };
  }
  const response = await contentManagement.client
    .get<DashboardCrudTypes['GetIn'], DashboardCrudTypes['GetOut']>({
      contentTypeId: DASHBOARD_CONTENT_ID,
      id,
    })
    .then((result) => {
      dashboardContentManagementServiceCache[id] = {
        item: result.item,
        meta: result.meta,
        lastFetched: new Date(),
      };
      return { id, status: 'success', attributes: result.item.attributes };
    })
    .catch((e) => ({ status: 'error', error: e.body, id }));

  return response as FindDashboardsByIdResponse;
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
  const { hits } = await contentManagement.client.search<
    DashboardCrudTypes['SearchIn'],
    DashboardCrudTypes['SearchOut']
  >({
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
