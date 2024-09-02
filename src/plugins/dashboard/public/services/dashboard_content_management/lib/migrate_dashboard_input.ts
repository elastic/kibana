/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EmbeddableFactoryNotFoundError,
  runEmbeddableFactoryMigrations,
} from '@kbn/embeddable-plugin/public';
import { DashboardContainerInput, DashboardPanelState } from '../../../../common';
import { type DashboardEmbeddableService } from '../../embeddable/types';
import { pluginServices } from '../../plugin_services';
import { SavedDashboardInput } from '../types';

/**
 * Run Dashboard migrations clientside. We pre-emptively run all migrations for all content on this Dashboard so that
 * we can ensure the `last saved state` which eventually resides in the Dashboard public state is fully migrated.
 * This prevents the reset button from un-migrating the panels on the Dashboard. This also means that the migrations may
 * get skipped at Embeddable create time - unless states with older versions are saved in the URL or session storage.
 */
export const migrateDashboardInput = (
  dashboardInput: SavedDashboardInput,
  embeddable: DashboardEmbeddableService
) => {
  const {
    embeddable: { reactEmbeddableRegistryHasKey },
  } = pluginServices.getServices();
  let anyMigrationRun = false;
  if (!dashboardInput) return dashboardInput;

  const migratedPanels: DashboardContainerInput['panels'] = {};
  for (const [id, panel] of Object.entries(dashboardInput.panels)) {
    // if the panel type is registered in the new embeddable system, we do not need to run migrations for it.
    if (reactEmbeddableRegistryHasKey(panel.type)) {
      migratedPanels[id] = panel;
      continue;
    }

    const factory = embeddable.getEmbeddableFactory(panel.type);
    if (!factory) throw new EmbeddableFactoryNotFoundError(panel.type);
    // run last saved migrations for by value panels only.
    if (!panel.explicitInput.savedObjectId) {
      const { input: newInput, migrationRun: panelMigrationRun } = runEmbeddableFactoryMigrations(
        panel.explicitInput,
        factory
      );
      if (panelMigrationRun) anyMigrationRun = true;
      panel.explicitInput = newInput as DashboardPanelState['explicitInput'];
    } else if (factory.latestVersion) {
      // by reference panels are always considered to be of the latest version
      panel.explicitInput.version = factory.latestVersion;
    }
    migratedPanels[id] = panel;
  }
  dashboardInput.panels = migratedPanels;
  return { dashboardInput, anyMigrationRun };
};
