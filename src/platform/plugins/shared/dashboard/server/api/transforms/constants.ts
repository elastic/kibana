/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardOptions } from '..';

export const DASHBOARD_SO_OPTION_KEYS = [
  'hidePanelTitles',
  'useMargins',
  'syncColors',
  'syncTooltips',
  'syncCursor',
];

export const DASHBOARD_API_OPTION_KEYS: Array<keyof DashboardOptions> = [
  'hide_panel_titles',
  'use_margins',
  'sync_colors',
  'sync_tooltips',
  'sync_cursor',
];
