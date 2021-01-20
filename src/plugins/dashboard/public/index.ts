/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginInitializerContext } from '../../../core/public';
import { DashboardPlugin } from './plugin';

export {
  DashboardContainer,
  DashboardContainerInput,
  DashboardContainerFactoryDefinition,
  DASHBOARD_CONTAINER_TYPE,
} from './application';
export { DashboardConstants, createDashboardEditUrl } from './dashboard_constants';

export {
  DashboardSetup,
  DashboardStart,
  DashboardUrlGenerator,
  DashboardFeatureFlagConfig,
} from './plugin';
export {
  DASHBOARD_APP_URL_GENERATOR,
  createDashboardUrlGenerator,
  DashboardUrlGeneratorState,
} from './url_generator';
export { DashboardSavedObject } from './saved_dashboards';
export { SavedDashboardPanel } from './types';

export function plugin(initializerContext: PluginInitializerContext) {
  return new DashboardPlugin(initializerContext);
}
