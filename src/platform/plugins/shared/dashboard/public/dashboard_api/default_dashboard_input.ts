/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardContainerInput } from '../../common';

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
