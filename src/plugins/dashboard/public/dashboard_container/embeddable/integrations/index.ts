/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export {
  getUnsavedChanges,
  startDiffingDashboardState,
  keysNotConsideredUnsavedChanges,
} from './diff_state/dashboard_diffing_integration';

export {
  startUnifiedSearchIntegration,
  applySavedFiltersToUnifiedSearch,
} from './unified_search/start_dashboard_unified_search_integration';

export {
  startControlGroupIntegration,
  combineDashboardFiltersWithControlGroupFilters,
} from './controls/dashboard_control_group_integration';

export { startSyncingDashboardDataViews } from './data_views/sync_dashboard_data_views';
export { startDashboardSearchSessionIntegration } from './search_sessions/start_dashboard_search_session_integration';
