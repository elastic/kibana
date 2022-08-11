/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const DASHBOARD_STATE_STORAGE_KEY = '_a';
export const GLOBAL_STATE_STORAGE_KEY = '_g';

export const DashboardConstants = {
  LANDING_PAGE_PATH: '/list',
  CREATE_NEW_DASHBOARD_URL: '/create',
  VIEW_DASHBOARD_URL: '/view',
  PRINT_DASHBOARD_URL: '/print',
  ADD_EMBEDDABLE_ID: 'addEmbeddableId',
  ADD_EMBEDDABLE_TYPE: 'addEmbeddableType',
  DASHBOARDS_ID: 'dashboards',
  DASHBOARD_ID: 'dashboard',
  SEARCH_SESSION_ID: 'searchSessionId',
  CHANGE_CHECK_DEBOUNCE: 100,
  CHANGE_APPLY_DEBOUNCE: 50,
};

export function createDashboardEditUrl(id?: string, editMode?: boolean) {
  if (!id) {
    return `${DashboardConstants.CREATE_NEW_DASHBOARD_URL}`;
  }
  const edit = editMode ? `?${DASHBOARD_STATE_STORAGE_KEY}=(viewMode:edit)` : '';
  return `${DashboardConstants.VIEW_DASHBOARD_URL}/${id}${edit}`;
}

export function createDashboardListingFilterUrl(filter: string | undefined) {
  return filter
    ? `${DashboardConstants.LANDING_PAGE_PATH}?filter="${filter}"`
    : DashboardConstants.LANDING_PAGE_PATH;
}
