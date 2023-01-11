/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isErrorEmbeddable, openAddPanelFlyout } from '@kbn/embeddable-plugin/public';
import { getSavedObjectFinder } from '@kbn/saved-objects-plugin/public';

import { pluginServices } from '../../../services/plugin_services';
import { DashboardContainer } from '../dashboard_container';

export function addFromLibrary(this: DashboardContainer) {
  const {
    overlays,
    notifications,
    usageCollection,
    settings: { uiSettings, theme },
    dashboardSavedObject: { savedObjectsClient },
    embeddable: { getEmbeddableFactories, getEmbeddableFactory },
  } = pluginServices.getServices();

  if (isErrorEmbeddable(this)) return;
  this.openOverlay(
    openAddPanelFlyout({
      SavedObjectFinder: getSavedObjectFinder({ client: savedObjectsClient }, uiSettings),
      reportUiCounter: usageCollection.reportUiCounter,
      getAllFactories: getEmbeddableFactories,
      getFactory: getEmbeddableFactory,
      embeddable: this,
      notifications,
      overlays,
      theme,
    })
  );
}
