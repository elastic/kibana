/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { SavedObjectError, SavedObjectsFindOptionsReference } from '@kbn/core/public';

import type {
  DashboardAttributes,
  DashboardGetIn,
  DashboardSearchIn,
  DashboardSearchOptions,
  DashboardSearchAPIResult,
  DashboardGetOut,
  DashboardSearchOut,
} from '../../../../server/content_management';
import { getDashboardContentManagementCache } from '..';
import { DASHBOARD_CONTENT_ID } from '../../../utils/telemetry_constants';
import { contentManagementService, coreServices } from '../../kibana_services';

export interface SearchDashboardsArgs {
  options?: DashboardSearchOptions;
  hasNoReference?: SavedObjectsFindOptionsReference[];
  hasReference?: SavedObjectsFindOptionsReference[];
  search: string;
  size: number;
}

export interface SearchDashboardsResponse {
  total: number;
  hits: DashboardSearchAPIResult['hits'];
}

export async function searchDashboards({
  hasNoReference,
  hasReference,
  options,
  search,
  size,
}: SearchDashboardsArgs): Promise<{
  total: DashboardSearchAPIResult['pagination']['total'];
  hits: DashboardSearchAPIResult['hits'];
}> {
  const queryParams = new URLSearchParams({
    perPage: size.toString(),
    ...(search && { search: `${search}*` }),
  });

  const response = await coreServices.http.get(`/api/dashboards/dashboard?${queryParams.toString()}`);

  const hits = response.items.map((item) => ({
    id: item.id,
    type: item.type,
    attributes: {
      title: item.data.title,
      description: item.data.description || '',
      timeRestore: item.data.timeRestore,
    },
    references: item.data.references || [],
    version: item.meta.version,
    createdAt: item.meta.createdAt,
    updatedAt: item.meta.updatedAt,
    createdBy: item.meta.createdBy,
    updatedBy: item.meta.updatedBy,
    managed: item.meta.managed,
    error: item.meta.error,
    namespaces: item.data.namespaces || item.data.spaces || [],
    originId: undefined,
  }));

  return {
    total: response.total,
    hits,
  };
}

export type FindDashboardsByIdResponse = { id: string } & (
  | { status: 'success'; attributes: DashboardAttributes; references: Reference[] }
  | { status: 'error'; error: SavedObjectError }
);

export async function findDashboardById(id: string): Promise<FindDashboardsByIdResponse> {
  const dashboardContentManagementCache = getDashboardContentManagementCache();

  const cachedDashboard = dashboardContentManagementCache.fetchDashboard(id);
  if (cachedDashboard) {
    return {
      id,
      status: 'success',
      attributes: cachedDashboard.item.attributes,
      references: cachedDashboard.item.references,
    };
  }

  try {
    const response = await coreServices.http.get(`/api/dashboards/dashboard/${id}`);

    const dashboardItem = {
      id: response.id,
      type: response.type,
      attributes: response.data,
      references: response.data.references || [],
      version: response.meta.version,
      createdAt: response.meta.createdAt,
      updatedAt: response.meta.updatedAt,
      createdBy: response.meta.createdBy,
      updatedBy: response.meta.updatedBy,
      managed: response.meta.managed,
      error: response.meta.error,
      namespaces: response.data.namespaces || response.data.spaces || [],
      originId: undefined,
    };

    const meta = {
      outcome: 'exactMatch' as const,
      aliasTargetId: undefined,
      aliasPurpose: undefined,
    };

    dashboardContentManagementCache.addDashboard({ item: dashboardItem, meta });
    return {
      id,
      status: 'success',
      attributes: dashboardItem.attributes,
      references: dashboardItem.references,
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
  const queryParams = new URLSearchParams({
    perPage: '10',
    search: title ? `${title}*` : '',
  });

  const response = await coreServices.http.get(`/api/dashboards/dashboard?${queryParams.toString()}`);

  const matchingDashboards = response.items.filter(
    (item) => item.data.title.toLowerCase() === title.toLowerCase()
  );
  if (matchingDashboards.length === 1) {
    return { id: matchingDashboards[0].id };
  }
}
