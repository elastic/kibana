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
import { ControlGroupInput, CONTROL_GROUP_TYPE } from '@kbn/controls-plugin/common';

import { type DashboardEmbeddableService } from '../../embeddable/types';
import { DashboardContainerInput, DashboardPanelState } from '../../../../common';

/**
 * Run Dashboard migrations clientside.
 */
export const migrateDashboardInput = (
  dashboardInput: DashboardContainerInput,
  embeddable: DashboardEmbeddableService
) => {
  let anyMigrationRun = false;
  if (!dashboardInput) return dashboardInput;
  if (dashboardInput.controlGroupInput) {
    const controlGroupFactory = embeddable.getEmbeddableFactory(CONTROL_GROUP_TYPE);
    if (!controlGroupFactory) throw new EmbeddableFactoryNotFoundError(CONTROL_GROUP_TYPE);
    const { input: migratedControlGroupInput, migrationRun: controlGroupMigrationRun } =
      runEmbeddableFactoryMigrations<ControlGroupInput>(
        {
          ...dashboardInput.controlGroupInput,
        },
        controlGroupFactory
      );
    dashboardInput.controlGroupInput = migratedControlGroupInput;
    if (controlGroupMigrationRun) anyMigrationRun = true;

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
    } else {
      // by reference panels are always considered to be of the latest version
      panel.explicitInput.version = factory.latestVersion;
    }
    migratedPanels[id] = panel;
  });
  dashboardInput.panels = migratedPanels;
  return { dashboardInput, anyMigrationRun };
};
