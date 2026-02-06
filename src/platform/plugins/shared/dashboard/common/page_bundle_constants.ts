/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const LANDING_PAGE_PATH = '/list';
/** The application ID for the Dashboard app. */
export const DASHBOARD_APP_ID = 'dashboards';
export const SEARCH_SESSION_ID = 'searchSessionId';
/** The number of columns in the dashboard grid layout. */
export const DASHBOARD_GRID_COLUMN_COUNT = 48;

export const DEFAULT_DASHBOARD_NAVIGATION_OPTIONS = {
  open_in_new_tab: false,
  use_time_range: true,
  use_filters: true,
};

// Do not change constant value - part of dashboard REST API
export const DASHBOARD_DRILLDOWN_TYPE = 'dashboard_drilldown';
