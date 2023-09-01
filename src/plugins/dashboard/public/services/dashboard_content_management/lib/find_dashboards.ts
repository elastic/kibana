/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectError, SavedObjectsFindOptionsReference } from '@kbn/core/public';

import { Reference } from '@kbn/content-management-utils';
import {
  DashboardItem,
  DashboardCrudTypes,
  DashboardAttributes,
} from '../../../../common/content_management';
import { DashboardStartDependencies } from '../../../plugin';
import { DASHBOARD_CONTENT_ID } from '../../../dashboard_constants';

export interface SearchDashboardsArgs {
  contentManagement: DashboardStartDependencies['contentManagement'];
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

export async function findDashboardsByIds(
  contentManagement: DashboardStartDependencies['contentManagement'],
  ids: string[]
): Promise<FindDashboardsByIdResponse[]> {
  const findPromises = ids.map((id) =>
    contentManagement.client.get<DashboardCrudTypes['GetIn'], DashboardCrudTypes['GetOut']>({
      contentTypeId: DASHBOARD_CONTENT_ID,
      id,
    })
  );
  const results = await Promise.all(findPromises);

  return results.map((result) => {
    if (result.item.error) return { status: 'error', error: result.item.error, id: result.item.id };
    const { attributes, id, references } = result.item;
    return { id, status: 'success', attributes, references };
  });
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
