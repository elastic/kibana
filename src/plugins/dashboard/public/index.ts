/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { PluginInitializerContext } from '../../../core/public/plugins/plugin_context';
import { DashboardPlugin } from './plugin';

export {
  DashboardContainer,
  DashboardContainerFactoryDefinition,
  DASHBOARD_CONTAINER_TYPE,
} from './application';
export { createDashboardEditUrl, DashboardConstants } from './dashboard_constants';
export { DashboardAppLocator, DashboardAppLocatorParams } from './locator';
export {
  DashboardFeatureFlagConfig,
  DashboardUrlGenerator,
} from './plugin';
export { DashboardSavedObject } from './saved_dashboards';
export { DashboardContainerInput, SavedDashboardPanel } from './types';
export {
  createDashboardUrlGenerator,
  DashboardUrlGeneratorState,
  DASHBOARD_APP_URL_GENERATOR,
} from './url_generator';

export function plugin(initializerContext: PluginInitializerContext) {
  return new DashboardPlugin(initializerContext);
}
