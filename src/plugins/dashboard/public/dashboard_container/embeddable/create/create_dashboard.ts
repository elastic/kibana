/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { batch } from 'react-redux';
import { Subject, Subscription } from 'rxjs';

import {
  migrateEmbeddableInput,
  EmbeddableFactoryNotFoundError,
} from '@kbn/embeddable-plugin/public';
import { lazyLoadReduxToolsPackage } from '@kbn/presentation-util-plugin/public';
import { ControlGroupInput, CONTROL_GROUP_TYPE } from '@kbn/controls-plugin/common';

import { DashboardContainer } from '../dashboard_container';
import { initializeDashboard } from './initialize_dashboard';
import { pluginServices } from '../../../services/plugin_services';
import { DashboardCreationOptions } from '../dashboard_container_factory';
import { DashboardContainerInput, DashboardPanelState } from '../../../../common';

/**
 * Builds a new Dashboard from scratch.
 */
export const createDashboard = async (
  creationOptions?: DashboardCreationOptions,
  dashboardCreationStartTime?: number,
  savedObjectId?: string
): Promise<DashboardContainer | undefined> => {
  const {
    data: { dataViews },
    dashboardContentManagement: { loadDashboardState },
  } = pluginServices.getServices();

  // --------------------------------------------------------------------------------------
  // Create method which allows work to be done on the dashboard container when it's ready.
  // --------------------------------------------------------------------------------------
  const dashboardContainerReady$ = new Subject<DashboardContainer>();
  const untilDashboardReady = () =>
    new Promise<DashboardContainer>((resolve) => {
      const subscription = dashboardContainerReady$.subscribe((container) => {
        subscription.unsubscribe();
        resolve(container);
      });
    });

  // --------------------------------------------------------------------------------------
  // Lazy load required systems and Dashboard saved object.
  // --------------------------------------------------------------------------------------
  const reduxEmbeddablePackagePromise = lazyLoadReduxToolsPackage();
  const defaultDataViewAssignmentPromise = dataViews.getDefaultDataView();
  const dashboardSavedObjectPromise = loadDashboardState({ id: savedObjectId });

  const [reduxEmbeddablePackage, savedObjectResult, defaultDataView] = await Promise.all([
    reduxEmbeddablePackagePromise,
    dashboardSavedObjectPromise,
    defaultDataViewAssignmentPromise,
  ]);

  if (!defaultDataView) {
    throw new Error('Dashboard requires at least one data view before it can be initialized.');
  }

  // --------------------------------------------------------------------------------------
  // Initialize Dashboard integrations
  // --------------------------------------------------------------------------------------
  const initializeResult = await initializeDashboard({
    loadDashboardReturn: savedObjectResult,
    untilDashboardReady,
    creationOptions,
  });
  if (!initializeResult) return;
  const { input, searchSessionId } = initializeResult;

  // --------------------------------------------------------------------------------------
  // Build and return the dashboard container.
  // --------------------------------------------------------------------------------------
  const initialLastSavedInput = migrateForLastSavedInput(savedObjectResult.dashboardInput);
  const dashboardContainer = new DashboardContainer(
    input,
    reduxEmbeddablePackage,
    searchSessionId,
    initialLastSavedInput,
    dashboardCreationStartTime,
    undefined,
    creationOptions,
    savedObjectId
  );
  dashboardContainerReady$.next(dashboardContainer);
  return dashboardContainer;
};

/**
 * Navigates an existing dashboard container to show content from a new Dashboard Saved Object.
 */
export async function navigateToDashboard(
  this: DashboardContainer,
  newSavedObjectId?: string,
  newCreationOptions?: Partial<DashboardCreationOptions>
) {
  this.integrationSubscriptions.unsubscribe();
  this.integrationSubscriptions = new Subscription();
  this.stopSyncingWithUnifiedSearch?.();

  const {
    dashboardContentManagement: { loadDashboardState },
  } = pluginServices.getServices();
  if (newCreationOptions) {
    this.creationOptions = { ...this.creationOptions, ...newCreationOptions };
  }
  const loadDashboardReturn = await loadDashboardState({ id: newSavedObjectId });

  const dashboardContainerReady$ = new Subject<DashboardContainer>();
  const untilDashboardReady = () =>
    new Promise<DashboardContainer>((resolve) => {
      const subscription = dashboardContainerReady$.subscribe((container) => {
        subscription.unsubscribe();
        resolve(container);
      });
    });

  const initializeResult = await initializeDashboard({
    creationOptions: this.creationOptions,
    controlGroup: this.controlGroup,
    untilDashboardReady,
    loadDashboardReturn,
  });
  if (!initializeResult) return;
  const { input: newInput, searchSessionId } = initializeResult;

  this.searchSessionId = searchSessionId;

  this.updateInput(newInput);
  batch(() => {
    this.dispatch.setLastSavedInput(migrateForLastSavedInput(loadDashboardReturn.dashboardInput));
    this.dispatch.setAnimatePanelTransforms(false); // prevents panels from animating on navigate.
    this.dispatch.setLastSavedId(newSavedObjectId);
  });
  dashboardContainerReady$.next(this);
}

/**
 * We know that the Embeddable children on this Dashboard will be automatically updated to their
 * latest versions via the Embeddable factory create method. This does not apply to the copy stored
 * for state-diffing and reset purposes. We need to apply all Embeddable migrations here too.
 */
const migrateForLastSavedInput = (input: DashboardContainerInput) => {
  const { embeddable } = pluginServices.getServices();
  if (!input) return input;
  if (input.controlGroupInput) {
    const controlGroupFactory = embeddable.getEmbeddableFactory(CONTROL_GROUP_TYPE);
    if (!controlGroupFactory) throw new EmbeddableFactoryNotFoundError(CONTROL_GROUP_TYPE);
    input.controlGroupInput = migrateEmbeddableInput<ControlGroupInput>(
      { ...input.controlGroupInput, id: `control_group_${input.id ?? 'new_dashboard'}` },
      controlGroupFactory
    );

    // temporarily migrate all of the Control children as well - we need a better system for this.
    const migratedControls: ControlGroupInput['panels'] = {};
    Object.entries(input.controlGroupInput.panels).forEach(([id, panel]) => {
      const factory = embeddable.getEmbeddableFactory(panel.type);
      if (!factory) throw new EmbeddableFactoryNotFoundError(panel.type);
      const newInput = migrateEmbeddableInput(panel.explicitInput, factory);
      panel.explicitInput = newInput as DashboardPanelState['explicitInput'];
      migratedControls[id] = panel;
    });
  }
  const migratedPanels: DashboardContainerInput['panels'] = {};
  Object.entries(input.panels).forEach(([id, panel]) => {
    const factory = embeddable.getEmbeddableFactory(panel.type);
    if (!factory) throw new EmbeddableFactoryNotFoundError(panel.type);
    // run last saved migrations for by value panels only.
    if (!panel.explicitInput.savedObjectId) {
      const newInput = migrateEmbeddableInput(panel.explicitInput, factory);
      panel.explicitInput = newInput as DashboardPanelState['explicitInput'];
    }
    migratedPanels[id] = panel;
  });
  input.panels = migratedPanels;
  return input;
};
