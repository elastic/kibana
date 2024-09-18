/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginInitializerContext } from '@kbn/core/public';

import { DashboardPlugin } from './plugin';
export {
  createDashboardEditUrl,
  DASHBOARD_APP_ID,
  LEGACY_DASHBOARD_APP_ID,
  DASHBOARD_GRID_COLUMN_COUNT,
  PanelPlacementStrategy,
} from './dashboard_constants';
export type { DashboardApi } from './dashboard_api/types';
export {
  LazyDashboardRenderer as DashboardRenderer,
  DASHBOARD_CONTAINER_TYPE,
  type DashboardCreationOptions,
  type DashboardLocatorParams,
  type IProvidesLegacyPanelPlacementSettings,
} from './dashboard_container';
export type { DashboardSetup, DashboardStart, DashboardFeatureFlagConfig } from './plugin';

export { DashboardListingTable } from './dashboard_listing';
export { DashboardTopNav } from './dashboard_top_nav';
export { type DashboardAppLocator, cleanEmptyKeys } from './dashboard_app/locator/locator';
export { getDashboardLocatorParamsFromEmbeddable } from './dashboard_app/locator/get_dashboard_locator_params';

export function plugin(initializerContext: PluginInitializerContext) {
  return new DashboardPlugin(initializerContext);
}
