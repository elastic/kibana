/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { batch } from 'react-redux';
import { Subject, Subscription } from 'rxjs';

import { lazyLoadReduxToolsPackage } from '@kbn/presentation-util-plugin/public';

import { DashboardPublicState } from '../../types';
import { DashboardContainer } from '../dashboard_container';
import { initializeDashboard } from './initialize_dashboard';
import { pluginServices } from '../../../services/plugin_services';
import { DEFAULT_DASHBOARD_INPUT } from '../../../dashboard_constants';
import { DashboardCreationOptions } from '../dashboard_container_factory';

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
  const initialComponentState: DashboardPublicState = {
    lastSavedInput: savedObjectResult.dashboardInput ?? {
      ...DEFAULT_DASHBOARD_INPUT,
      id: input.id,
    },
    hasRunClientsideMigrations: savedObjectResult.anyMigrationRun,
    isEmbeddedExternally: creationOptions?.isEmbeddedExternally,
    animatePanelTransforms: false, // set panel transforms to false initially to avoid panels animating on initial render.
    hasUnsavedChanges: false, // if there is initial unsaved changes, the initial diff will catch them.
    lastSavedId: savedObjectId,
  };
  const dashboardContainer = new DashboardContainer(
    input,
    reduxEmbeddablePackage,
    searchSessionId,
    initialComponentState,
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
    this.dispatch.setLastSavedInput(loadDashboardReturn.dashboardInput);
    this.dispatch.setAnimatePanelTransforms(false); // prevents panels from animating on navigate.
    this.dispatch.setLastSavedId(newSavedObjectId);
  });
  dashboardContainerReady$.next(this);
}
