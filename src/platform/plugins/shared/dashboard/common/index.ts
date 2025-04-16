/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type {
  DashboardCapabilities,
  DashboardLocatorParams,
  DashboardSettings,
  DashboardState,
} from './types';

export type { DashboardPanelMap, DashboardPanelState } from './dashboard_container/types';

export {
  type InjectExtractDeps,
  injectReferences,
  extractReferences,
} from './dashboard_saved_object/persistable_state/dashboard_saved_object_references';

export {
  createInject,
  createExtract,
} from './dashboard_container/persistable_state/dashboard_container_references';

export { prefixReferencesFromPanel } from './dashboard_container/persistable_state/dashboard_container_references';

export {
  convertPanelsArrayToPanelMap,
  convertPanelMapToPanelsArray,
  generateNewPanelIds,
} from './lib/dashboard_panel_converters';

export {
  LANDING_PAGE_PATH,
  DASHBOARD_APP_ID,
  LEGACY_DASHBOARD_APP_ID,
  SEARCH_SESSION_ID,
  UI_SETTINGS,
} from './constants';

export { CONTENT_ID, LATEST_VERSION } from './content_management';
export {
  cleanEmptyKeys,
  getDashboardLocatorParamsFromEmbeddable,
  loadDashboardHistoryLocationState,
  DashboardAppLocatorDefinition,
} from './locator';
