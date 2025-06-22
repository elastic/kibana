/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LANDING_PAGE_PATH } from '../../common/constants';

export const DASHBOARD_STATE_STORAGE_KEY = '_a';
export const GLOBAL_STATE_STORAGE_KEY = '_g';
export const CREATE_NEW_DASHBOARD_URL = '/create';
export const VIEW_DASHBOARD_URL = '/view';
export const PRINT_DASHBOARD_URL = '/print';

export const getFullPath = (aliasId?: string, id?: string) =>
  `/app/dashboards#${createDashboardEditUrl(aliasId || id)}`;

export const getFullEditPath = (id?: string, editMode?: boolean) => {
  return `/app/dashboards#${createDashboardEditUrl(id, editMode)}`;
};

export function createDashboardEditUrl(id?: string, editMode?: boolean) {
  if (!id) {
    return `${CREATE_NEW_DASHBOARD_URL}`;
  }
  const edit = editMode ? `?${DASHBOARD_STATE_STORAGE_KEY}=(viewMode:edit)` : '';
  return `${VIEW_DASHBOARD_URL}/${id}${edit}`;
}

export function createDashboardListingFilterUrl(filter: string | undefined) {
  return filter ? `${LANDING_PAGE_PATH}?filter="${filter}"` : LANDING_PAGE_PATH;
}
