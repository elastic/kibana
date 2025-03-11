/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const LANDING_PAGE_PATH = '/list';

export const DASHBOARD_APP_ID = 'dashboards';
export const LEGACY_DASHBOARD_APP_ID = 'dashboard';
export const SEARCH_SESSION_ID = 'searchSessionId';

export enum PanelPlacementStrategy {
  /** Place on the very top of the Dashboard, add the height of this panel to all other panels. */
  placeAtTop = 'placeAtTop',
  /** Look for the smallest y and x value where the default panel will fit. */
  findTopLeftMostOpenSpace = 'findTopLeftMostOpenSpace',
}
