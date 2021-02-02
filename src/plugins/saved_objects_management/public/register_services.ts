/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { StartServicesAccessor } from '../../../core/public';
import { SavedObjectsManagementPluginStart, StartDependencies } from './plugin';
import { ISavedObjectsManagementServiceRegistry } from './services';

export const registerServices = async (
  registry: ISavedObjectsManagementServiceRegistry,
  getStartServices: StartServicesAccessor<StartDependencies, SavedObjectsManagementPluginStart>
) => {
  const [, { dashboard, visualizations, discover }] = await getStartServices();

  if (dashboard) {
    registry.register({
      id: 'savedDashboards',
      title: 'dashboards',
      service: dashboard.getSavedDashboardLoader(),
    });
  }

  if (visualizations) {
    registry.register({
      id: 'savedVisualizations',
      title: 'visualizations',
      service: visualizations.savedVisualizationsLoader,
    });
  }

  if (discover) {
    registry.register({
      id: 'savedSearches',
      title: 'searches',
      service: discover.savedSearchLoader,
    });
  }
};
