/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PresentationUtilPlugin } from './plugin';

export type { PresentationLabsService } from './services/presentation_labs_service';

export type { PresentationUtilPluginSetup, PresentationUtilPluginStart } from './types';
export type { SaveModalDashboardProps } from './components/types';

export {
  LazyLabsBeakerButton,
  LazyLabsFlyout,
  LazyDashboardPicker,
  LazySavedObjectSaveModalDashboard,
  LazySavedObjectSaveModalDashboardWithSaveResult,
  withSuspense,
  LazyDataViewPicker,
  LazyFieldPicker,
} from './components';

export {
  PanelPlacementStrategy,
  type PanelSettings,
  type PanelResizeSettings,
} from './registries/panel_placement';

export function plugin() {
  return new PresentationUtilPlugin();
}
