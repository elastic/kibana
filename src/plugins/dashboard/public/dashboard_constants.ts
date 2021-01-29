/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ViewMode } from './services/embeddable';
import { setStateToKbnUrl } from './services/kibana_utils';

const DASHBOARD_STATE_STORAGE_KEY = '_a';

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

export function createDashboardEditUrl(id?: string, editMode?: boolean) {
  if (!id) {
    return `${DashboardConstants.CREATE_NEW_DASHBOARD_URL}`;
  }
  const viewUrl = `${DashboardConstants.VIEW_DASHBOARD_URL}/${id}`;
  if (editMode) {
    const editUrl = setStateToKbnUrl(
      DASHBOARD_STATE_STORAGE_KEY,
      { viewMode: ViewMode.EDIT },
      { useHash: false, storeInHashQuery: false },
      viewUrl
    );
    return editUrl;
  }
  return viewUrl;
}

export function createDashboardListingFilterUrl(filter: string | undefined) {
  return filter
    ? `${DashboardConstants.LANDING_PAGE_PATH}?filter="${filter}"`
    : DashboardConstants.LANDING_PAGE_PATH;
}
