/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DASHBOARD_GRID_COLUMN_COUNT } from './page_bundle_constants';

/** The base API path for dashboard endpoints. */
export const DASHBOARD_API_PATH = '/api/dashboards';
export const DASHBOARD_API_VERSION = '1';

export const DASHBOARD_SAVED_OBJECT_TYPE = 'dashboard';

export const DEFAULT_PANEL_WIDTH = DASHBOARD_GRID_COLUMN_COUNT / 2;
export const DEFAULT_PANEL_HEIGHT = 15;

export const DEFAULT_DASHBOARD_OPTIONS = {
  hide_panel_titles: false,
  use_margins: true,
  auto_apply_filters: true,
  sync_colors: false,
  sync_cursor: true,
  sync_tooltips: false,
} as const;

export const UI_SETTINGS = {
  ENABLE_LABS_UI: 'labs:dashboard:enable_ui',
};
