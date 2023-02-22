/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  SavedObjectError,
  SavedObjectsClientContract,
  SavedObjectsFindOptionsReference,
  SimpleSavedObject,
} from '@kbn/core/public';

import { DashboardAttributes } from '../../../../common';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../../dashboard_constants';

export interface FindDashboardSavedObjectsArgs {
  hasReference?: SavedObjectsFindOptionsReference[];
  hasNoReference?: SavedObjectsFindOptionsReference[];
  savedObjectsClient: SavedObjectsClientContract;
  search: string;
  size: number;
}

export interface FindDashboardSavedObjectsResponse {
  total: number;
  hits: Array<SimpleSavedObject<DashboardAttributes>>;
}

export async function findDashboardSavedObjects({
  savedObjectsClient,
  hasReference,
  hasNoReference,
  search,
  size,
}: FindDashboardSavedObjectsArgs): Promise<FindDashboardSavedObjectsResponse> {
  const { total, savedObjects } = await savedObjectsClient.find<DashboardAttributes>({
    type: DASHBOARD_SAVED_OBJECT_TYPE,
    search: search ? `${search}*` : undefined,
    searchFields: ['title^3', 'description'],
    defaultSearchOperator: 'AND' as 'AND',
    perPage: size,
    hasReference,
    hasNoReference,
    page: 1,
  });
  return {
    total,
    hits: savedObjects,
  };
}

export type FindDashboardBySavedObjectIdsResult = { id: string } & (
  | { status: 'success'; attributes: DashboardAttributes }
  | { status: 'error'; error: SavedObjectError }
);

export async function findDashboardSavedObjectsByIds(
  savedObjectsClient: SavedObjectsClientContract,
  ids: string[]
): Promise<FindDashboardBySavedObjectIdsResult[]> {
  const { savedObjects } = await savedObjectsClient.bulkGet(
    ids.map((id) => ({ id, type: DASHBOARD_SAVED_OBJECT_TYPE }))
  );

  return savedObjects.map((savedObjectResult) => {
    if (savedObjectResult.error)
      return { status: 'error', error: savedObjectResult.error, id: savedObjectResult.id };
    const { attributes, id } = savedObjectResult;
    return {
      id,
      status: 'success',
      attributes: attributes as DashboardAttributes,
    };
  });
}

export async function findDashboardIdByTitle(
  title: string,
  savedObjectsClient: SavedObjectsClientContract
): Promise<{ id: string } | undefined> {
  const results = await savedObjectsClient.find<DashboardAttributes>({
    search: `"${title}"`,
    searchFields: ['title'],
    type: 'dashboard',
  });
  // The search isn't an exact match, lets see if we can find a single exact match to use
  const matchingDashboards = results.savedObjects.filter(
    (dashboard) => dashboard.attributes.title.toLowerCase() === title.toLowerCase()
  );
  if (matchingDashboards.length === 1) {
    return { id: matchingDashboards[0].id };
  }
}
