/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { GridData } from './embeddable/types';
export type {
  RawSavedDashboardPanel730ToLatest,
  DashboardDoc730ToLatest,
  DashboardDoc700To720,
  DashboardDocPre700,
} from './bwc/types';
export type {
  DashboardContainerStateWithType,
  SavedDashboardPanelTo60,
  SavedDashboardPanel610,
  SavedDashboardPanel620,
  SavedDashboardPanel630,
  SavedDashboardPanel640To720,
  SavedDashboardPanel730ToLatest,
} from './types';

export { migratePanelsTo730 } from './migrate_to_730_panels';

export const UI_SETTINGS = {
  ENABLE_LABS_UI: 'labs:dashboard:enable_ui',
};

export {
  controlGroupInputToRawAttributes,
  getDefaultDashboardControlGroupInput,
  rawAttributesToControlGroupInput,
  rawAttributesToSerializable,
  serializableToRawAttributes,
} from './embeddable/dashboard_control_group';
