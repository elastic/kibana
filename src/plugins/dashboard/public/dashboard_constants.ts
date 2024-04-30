/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ViewMode } from '@kbn/embeddable-plugin/common';
import type { DashboardContainerInput } from '../common';

// ------------------------------------------------------------------
// URL Constants
// ------------------------------------------------------------------
export const DASHBOARD_STATE_STORAGE_KEY = '_a';
export const GLOBAL_STATE_STORAGE_KEY = '_g';
export const LANDING_PAGE_PATH = '/list';
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

// ------------------------------------------------------------------
// Telemetry & Events
// ------------------------------------------------------------------
export const DASHBOARD_LOADED_EVENT = 'dashboard_loaded';
export const SAVED_OBJECT_LOADED_TIME = 'saved_object_loaded_time';
export const SAVED_OBJECT_DELETE_TIME = 'saved_object_delete_time';
export const SAVED_OBJECT_POST_TIME = 'saved_object_post_time';
export const DASHBOARD_UI_METRIC_ID = 'dashboard';

// ------------------------------------------------------------------
// IDs
// ------------------------------------------------------------------
export const DASHBOARD_APP_ID = 'dashboards';
export const LEGACY_DASHBOARD_APP_ID = 'dashboard';
export const SEARCH_SESSION_ID = 'searchSessionId';

// ------------------------------------------------------------------
// Grid
// ------------------------------------------------------------------
export const DEFAULT_PANEL_HEIGHT = 15;
export const DASHBOARD_MARGIN_SIZE = 8;
export const DASHBOARD_GRID_HEIGHT = 20;
export const DASHBOARD_GRID_COLUMN_COUNT = 48;
export const DEFAULT_PANEL_WIDTH = DASHBOARD_GRID_COLUMN_COUNT / 2;

export const CHANGE_CHECK_DEBOUNCE = 100;

// ------------------------------------------------------------------
// Content Management
// ------------------------------------------------------------------
export { CONTENT_ID as DASHBOARD_CONTENT_ID } from '../common/content_management/constants';

export const DASHBOARD_CACHE_SIZE = 20; // only store a max of 20 dashboards
export const DASHBOARD_CACHE_TTL = 1000 * 60 * 5; // time to live = 5 minutes

// ------------------------------------------------------------------
// Default State
// ------------------------------------------------------------------
export const DEFAULT_DASHBOARD_INPUT: Omit<DashboardContainerInput, 'id'> = {
  viewMode: ViewMode.VIEW,
  timeRestore: false,
  query: { query: '', language: 'kuery' },
  description: '',
  filters: [],
  panels: {},
  title: '',
  tags: [],
  executionContext: {
    type: 'dashboard',
  },

  // options
  useMargins: true,
  syncColors: false,
  syncCursor: true,
  syncTooltips: false,
  hidePanelTitles: false,
};
