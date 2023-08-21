/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from '@kbn/core/public';

import { DashboardPlugin } from './plugin';
export {
  createDashboardEditUrl,
  DASHBOARD_APP_ID,
  LEGACY_DASHBOARD_APP_ID,
} from './dashboard_constants';
export {
  type DashboardAPI,
  type AwaitingDashboardAPI,
  DashboardRenderer,
  DASHBOARD_CONTAINER_TYPE,
  type DashboardCreationOptions,
} from './dashboard_container';
export type { DashboardSetup, DashboardStart, DashboardFeatureFlagConfig } from './plugin';

export { DashboardListingTable } from './dashboard_listing';

export {
  type DashboardAppLocator,
  type DashboardAppLocatorParams,
  cleanEmptyKeys,
} from './dashboard_app/locator/locator';
export { getDashboardLocatorParams } from './dashboard_app/locator/get_dashboard_locator_params';

export function plugin(initializerContext: PluginInitializerContext) {
  return new DashboardPlugin(initializerContext);
}
