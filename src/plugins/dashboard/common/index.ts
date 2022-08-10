/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type {
  GridData,
  DashboardPanelMap,
  SavedDashboardPanel,
  DashboardAttributes,
  DashboardPanelState,
  DashboardContainerStateWithType,
} from './types';

export {
  injectReferences,
  extractReferences,
} from './persistable_state/dashboard_saved_object_references';

export { createInject, createExtract } from './persistable_state/dashboard_container_references';

export {
  convertPanelStateToSavedDashboardPanel,
  convertSavedDashboardPanelToPanelState,
  convertSavedPanelsToPanelMap,
  convertPanelMapToSavedPanels,
} from './lib/dashboard_panel_converters';

export const UI_SETTINGS = {
  ENABLE_LABS_UI: 'labs:dashboard:enable_ui',
};
