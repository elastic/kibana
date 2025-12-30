/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { type PresentationLabsService } from '.';
import type {
  getPanelPlacementSettings,
  registerPanelPlacementSettings,
} from './registries/panel_placement';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PresentationUtilPluginSetup {}

export interface PresentationUtilPluginStart {
  labsService: PresentationLabsService;
  registerPanelPlacementSettings: typeof registerPanelPlacementSettings;
  getPanelPlacementSettings: typeof getPanelPlacementSettings;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PresentationUtilPluginSetupDeps {}

export interface PresentationUtilPluginStartDeps {
  dataViews: DataViewsPublicPluginStart;
  uiActions: UiActionsStart;
}
