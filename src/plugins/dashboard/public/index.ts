/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from '../../../core/public';
import { DashboardPlugin } from './plugin';

export {
  DashboardContainer,
  DashboardContainerFactoryDefinition,
  DASHBOARD_CONTAINER_TYPE,
} from './application';
export { DashboardConstants, createDashboardEditUrl } from './dashboard_constants';

export type {
  DashboardSetup,
  DashboardStart,
  DashboardUrlGenerator,
  DashboardFeatureFlagConfig,
} from './plugin';

export type { DashboardUrlGeneratorState } from './url_generator';
export { DASHBOARD_APP_URL_GENERATOR, createDashboardUrlGenerator } from './url_generator';
export type { DashboardAppLocator, DashboardAppLocatorParams } from './locator';

export type { DashboardSavedObject } from './saved_dashboards';
export type { SavedDashboardPanel, DashboardContainerInput } from './types';

export function plugin(initializerContext: PluginInitializerContext) {
  return new DashboardPlugin(initializerContext);
}
