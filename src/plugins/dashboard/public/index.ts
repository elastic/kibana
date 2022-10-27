/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from '@kbn/core/public';
import { DashboardPlugin } from './plugin';

export { DASHBOARD_CONTAINER_TYPE } from './dashboard_container';
export { createDashboardEditUrl } from './dashboard_constants';
export type { DashboardSetup, DashboardStart, DashboardFeatureFlagConfig } from './plugin';

export {
  type DashboardAppLocator,
  type DashboardAppLocatorParams,
  cleanEmptyKeys,
} from './dashboard_app/locator/locator';

export { DASHBOARD_APP_ID } from './dashboard_constants';

export function plugin(initializerContext: PluginInitializerContext) {
  return new DashboardPlugin(initializerContext);
}
