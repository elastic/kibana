/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DashboardAppLocator } from './locator';
import { SavedObjectLoader } from '../../saved_objects/public/saved_object/saved_object_loader';
import { createDashboardContainerByValueRenderer } from './application/embeddable/dashboard_container_by_value_renderer';
import { UrlGeneratorContract } from './services/share';
import { DASHBOARD_APP_URL_GENERATOR } from './url_generator';


export interface DashboardSetup {
  locator?: DashboardAppLocator;
}

export interface DashboardStart {
  getSavedDashboardLoader: () => SavedObjectLoader;
  getDashboardContainerByValueRenderer: () => ReturnType<
    typeof createDashboardContainerByValueRenderer
  >;
  /**
   * @deprecated Use dashboard locator instead. Dashboard locator is available
   * under `.locator` key. This dashboard URL generator will be removed soon.
   *
   * ```ts
   * plugins.dashboard.locator.getLocation({ ... });
   * ```
   */
  dashboardUrlGenerator?: DashboardUrlGenerator;
  locator?: DashboardAppLocator;
  dashboardFeatureFlagConfig: DashboardFeatureFlagConfig;
}

export interface DashboardFeatureFlagConfig {
  allowByValueEmbeddables: boolean;
}

export type DashboardUrlGenerator = UrlGeneratorContract<typeof DASHBOARD_APP_URL_GENERATOR>;
