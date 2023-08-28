/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  runEmbeddableFactoryMigrations,
  EmbeddableFactoryNotFoundError,
} from '@kbn/embeddable-plugin/public';
import { ControlGroupInput } from '@kbn/controls-plugin/common';

import { type DashboardEmbeddableService } from '../../embeddable/types';
import { DashboardContainerInput, DashboardPanelState } from '../../../../common';

/**
 * Run Dashboard migrations clientside. We pre-emptively run all migrations for all content on this Dashboard so that
 * we can ensure the `last saved state` which eventually resides in the Dashboard public state is fully migrated.
 * This prevents the reset button from un-migrating the panels on the Dashboard. This also means that the migrations may
 * get skipped at Embeddable create time - unless states with older versions are saved in the URL or session storage.
 */
export const migrateDashboardInput = (
  dashboardInput: DashboardContainerInput,
  embeddable: DashboardEmbeddableService
) => {
  let anyMigrationRun = false;
  if (!dashboardInput) return dashboardInput;
  if (dashboardInput.controlGroupInput) {
    /**
     * If any Control Group migrations are required, we will need to start storing a Control Group Input version
     * string in Dashboard Saved Objects and then running the whole Control Group input through the embeddable
     * factory migrations here.
     */

    // Migrate all of the Control children as well.
    const migratedControls: ControlGroupInput['panels'] = {};

    Object.entries(dashboardInput.controlGroupInput.panels).forEach(([id, panel]) => {
      const factory = embeddable.getEmbeddableFactory(panel.type);
      if (!factory) throw new EmbeddableFactoryNotFoundError(panel.type);
      const { input: newInput, migrationRun: controlMigrationRun } = runEmbeddableFactoryMigrations(
        panel.explicitInput,
        factory
      );
      if (controlMigrationRun) anyMigrationRun = true;
      panel.explicitInput = newInput as DashboardPanelState['explicitInput'];
      migratedControls[id] = panel;
    });
  }
  const migratedPanels: DashboardContainerInput['panels'] = {};
  Object.entries(dashboardInput.panels).forEach(([id, panel]) => {
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
  });
  dashboardInput.panels = migratedPanels;
  return { dashboardInput, anyMigrationRun };
};
