/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { DashboardCapabilities } from './types';

export type {
  DashboardPanelMap,
  DashboardPanelState,
  DashboardContainerByReferenceInput,
} from './dashboard_container/types';

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

export const UI_SETTINGS = {
  ENABLE_LABS_UI: 'labs:dashboard:enable_ui',
};
