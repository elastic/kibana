/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const DashboardConstants = {
  LANDING_PAGE_PATH: '/list',
  CREATE_NEW_DASHBOARD_URL: '/create',
  VIEW_DASHBOARD_URL: '/view',
  ADD_EMBEDDABLE_ID: 'addEmbeddableId',
  ADD_EMBEDDABLE_TYPE: 'addEmbeddableType',
  DASHBOARDS_ID: 'dashboards',
  DASHBOARD_ID: 'dashboard',
  SEARCH_SESSION_ID: 'searchSessionId',
};

export function createDashboardEditUrl(id: string) {
  return `${DashboardConstants.VIEW_DASHBOARD_URL}/${id}`;
}

export function createDashboardListingFilterUrl(filter: string | undefined) {
  return filter
    ? `${DashboardConstants.LANDING_PAGE_PATH}?filter="${filter}"`
    : DashboardConstants.LANDING_PAGE_PATH;
}
