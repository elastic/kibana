/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { COMMON_HEADERS, DASHBOARD_API_PATH } from '../../../scout/api/fixtures';

export const KBN_ARCHIVES = {
  LEGACY_VEGA_PANEL_MIGRATION:
    'src/platform/plugins/shared/dashboard/test/scout_vega/api/fixtures/archives/legacy_vega_panel_migration.json',
  LEGACY_VEGA_BY_VALUE_PANEL_MIGRATION:
    'src/platform/plugins/shared/dashboard/test/scout_vega/api/fixtures/archives/legacy_vega_by_value_panel_migration.json',
} as const;

export const LEGACY_VEGA_DASHBOARD_ID = 'legacy_vega_dashboard';
export const LEGACY_VEGA_VISUALIZATION_ID = 'legacy_vega_visualization';
export const LEGACY_VEGA_BY_VALUE_DASHBOARD_ID = 'legacy_vega_by_value_dashboard';
export const LEGACY_VEGA_HYBRID_DASHBOARD_ID = 'legacy_vega_hybrid_dashboard';
