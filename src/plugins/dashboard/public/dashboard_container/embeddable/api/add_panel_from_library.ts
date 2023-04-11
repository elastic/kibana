/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpStart } from '@kbn/core/public';
import { isErrorEmbeddable, openAddPanelFlyout } from '@kbn/embeddable-plugin/public';
import { getSavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';

import { pluginServices } from '../../../services/plugin_services';
import { DashboardContainer } from '../dashboard_container';

export function addFromLibrary(this: DashboardContainer) {
  const {
    overlays,
    notifications,
    usageCollection,
    settings: { uiSettings, theme },
    embeddable: { getEmbeddableFactories, getEmbeddableFactory },
    http,
    savedObjectsManagement,
    savedObjectsTagging,
  } = pluginServices.getServices();

  if (isErrorEmbeddable(this)) return;
  this.openOverlay(
    openAddPanelFlyout({
      SavedObjectFinder: getSavedObjectFinder(
        uiSettings,
        http as HttpStart,
        savedObjectsManagement,
        savedObjectsTagging.api
      ),
      reportUiCounter: usageCollection.reportUiCounter,
      getAllFactories: getEmbeddableFactories,
      getFactory: getEmbeddableFactory,
      embeddable: this,
      notifications,
      overlays,
      theme,
      onAddPanel: (id: string) => {
        this.setScrollToPanelId(id);
        this.setHighlightPanelId(id);
      },
    })
  );
}
