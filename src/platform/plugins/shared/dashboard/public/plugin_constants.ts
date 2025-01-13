/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardContainerInput } from '../common';

export const LANDING_PAGE_PATH = '/list';

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

export enum PanelPlacementStrategy {
  /** Place on the very top of the Dashboard, add the height of this panel to all other panels. */
  placeAtTop = 'placeAtTop',
  /** Look for the smallest y and x value where the default panel will fit. */
  findTopLeftMostOpenSpace = 'findTopLeftMostOpenSpace',
}

// ------------------------------------------------------------------
// Default State
// ------------------------------------------------------------------
export const DEFAULT_DASHBOARD_INPUT: Omit<DashboardContainerInput, 'id'> = {
  viewMode: 'view',
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
