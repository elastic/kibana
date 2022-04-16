/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import type { KibanaExecutionContext } from '@kbn/core/public';
import { DashboardSavedObject } from '../../saved_dashboards';
import { DashboardContainer, DASHBOARD_CONTAINER_TYPE } from '../embeddable';
import {
  DashboardBuildContext,
  DashboardState,
  DashboardContainerInput,
  DashboardAppServices,
} from '../../types';
import {
  enableDashboardSearchSessions,
  getSearchSessionIdFromURL,
  stateToDashboardContainerInput,
} from '.';
import {
  ContainerOutput,
  EmbeddableFactoryNotFoundError,
  EmbeddableInput,
  EmbeddablePackageState,
  ErrorEmbeddable,
  isErrorEmbeddable,
} from '../../services/embeddable';

type BuildDashboardContainerProps = DashboardBuildContext & {
  data: DashboardAppServices['data']; // the whole data service is required here because it is required by getLocatorParams
  savedDashboard: DashboardSavedObject;
  initialDashboardState: DashboardState;
  incomingEmbeddable?: EmbeddablePackageState;
  executionContext?: KibanaExecutionContext;
};

/**
 * Builds the dashboard container and manages initial search session
 */
export const buildDashboardContainer = async ({
  getLatestDashboardState,
  initialDashboardState,
  isEmbeddedExternally,
  dashboardCapabilities,
  incomingEmbeddable,
  savedDashboard,
  kibanaVersion,
  embeddable,
  history,
  data,
  executionContext,
}: BuildDashboardContainerProps) => {
  const {
    search: { session },
  } = data;

  // set up search session
  enableDashboardSearchSessions({
    data,
    kibanaVersion,
    savedDashboard,
    initialDashboardState,
    getLatestDashboardState,
    canStoreSearchSession: dashboardCapabilities.storeSearchSession,
  });

  if (incomingEmbeddable?.searchSessionId) {
    session.continue(incomingEmbeddable?.searchSessionId);
  }

  const searchSessionIdFromURL = getSearchSessionIdFromURL(history);
  if (searchSessionIdFromURL) {
    session.restore(searchSessionIdFromURL);
  }

  const dashboardFactory = embeddable.getEmbeddableFactory<
    DashboardContainerInput,
    ContainerOutput,
    DashboardContainer
  >(DASHBOARD_CONTAINER_TYPE);

  if (!dashboardFactory) {
    throw new EmbeddableFactoryNotFoundError('dashboard app requires dashboard embeddable factory');
  }

  /**
   * Use an existing session instead of starting a new one if there is a session already, and dashboard is being created with an incoming
   * embeddable.
   */
  const existingSession = session.getSessionId();
  const searchSessionId =
    searchSessionIdFromURL ??
    (existingSession && incomingEmbeddable ? existingSession : session.start());

  // Build the initial input for the dashboard container based on the dashboard state.
  const initialInput = stateToDashboardContainerInput({
    isEmbeddedExternally: Boolean(isEmbeddedExternally),
    dashboardState: initialDashboardState,
    dashboardCapabilities,
    incomingEmbeddable,
    query: data.query,
    searchSessionId,
    savedDashboard,
    executionContext,
  });

  /**
   * Handle the Incoming Embeddable Part 1:
   * If the incoming embeddable already exists e.g. if it has been edited by value, the incoming state for that panel needs to replace the
   * state for the matching panel already in the dashboard. This needs to happen BEFORE the dashboard container is built, so that the panel
   * retains the same placement.
   */
  if (incomingEmbeddable?.embeddableId && initialInput.panels[incomingEmbeddable.embeddableId]) {
    const originalPanelState = initialInput.panels[incomingEmbeddable.embeddableId];
    initialInput.panels = {
      ...initialInput.panels,
      [incomingEmbeddable.embeddableId]: {
        gridData: originalPanelState.gridData,
        type: incomingEmbeddable.type,
        explicitInput: {
          ...(incomingEmbeddable.type === originalPanelState.type && {
            ...originalPanelState.explicitInput,
          }),
          ...incomingEmbeddable.input,
          id: incomingEmbeddable.embeddableId,
        },
      },
    };
  }

  const dashboardContainer = await dashboardFactory.create(initialInput);
  if (!dashboardContainer || isErrorEmbeddable(dashboardContainer)) {
    tryDestroyDashboardContainer(dashboardContainer);
    return;
  }

  /**
   * Handle the Incoming Embeddable Part 2:
   * If the incoming embeddable is new, we can add it to the container using `addNewEmbeddable` after the container is created
   * this lets the container handle the placement of it (using the default placement algorithm "top left most open space")
   */
  if (
    incomingEmbeddable &&
    (!incomingEmbeddable?.embeddableId ||
      (incomingEmbeddable.embeddableId &&
        !dashboardContainer.getInput().panels[incomingEmbeddable.embeddableId]))
  ) {
    dashboardContainer.addNewEmbeddable<EmbeddableInput>(
      incomingEmbeddable.type,
      incomingEmbeddable.input
    );
  }

  return dashboardContainer;
};

export const tryDestroyDashboardContainer = (
  container: DashboardContainer | ErrorEmbeddable | undefined
) => {
  try {
    container?.destroy();
  } catch (e) {
    // destroy could throw if something has already destroyed the container
    // eslint-disable-next-line no-console
    console.warn(e);
  }
};
