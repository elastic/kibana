/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO move to top level constant file

// dashboard api latest version
// TODO rename to DASHBOARD_API_LATEST_VERSION
export const LATEST_VERSION = 3;

// dashboard api CONTENT_ID
// TODO rename to DASHBOARD_API_CONTENT_ID
export const CONTENT_ID = 'dashboard';

export const DASHBOARD_GRID_COLUMN_COUNT = 48;
export const DEFAULT_PANEL_WIDTH = DASHBOARD_GRID_COLUMN_COUNT / 2;
export const DEFAULT_PANEL_HEIGHT = 15;

export const DEFAULT_DASHBOARD_OPTIONS = {
  hidePanelTitles: false,
  useMargins: true,
  syncColors: true,
  syncCursor: true,
  syncTooltips: true,
} as const;
