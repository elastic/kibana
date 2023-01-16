/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaExecutionContext } from '@kbn/core/public';
import {
  ContainerOutput,
  EmbeddableFactoryNotFoundError,
  EmbeddableInput,
  EmbeddablePackageState,
  ErrorEmbeddable,
  isErrorEmbeddable,
} from '@kbn/embeddable-plugin/public';

import { DashboardContainer } from '../embeddable';
import { DashboardBuildContext, DashboardState, DashboardContainerInput } from '../../types';
import {
  enableDashboardSearchSessions,
  getSearchSessionIdFromURL,
  stateToDashboardContainerInput,
} from '.';
import { pluginServices } from '../../services/plugin_services';
import { DASHBOARD_CONTAINER_TYPE } from '../../dashboard_constants';

type BuildDashboardContainerProps = DashboardBuildContext & {
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
  incomingEmbeddable,
  history,
  executionContext,
}: BuildDashboardContainerProps) => {
  const {
    dashboardCapabilities: { storeSearchSession: canStoreSearchSession },
    data: {
      search: { session },
    },
    embeddable: { getEmbeddableFactory },
  } = pluginServices.getServices();

  // set up search session
  enableDashboardSearchSessions({
    initialDashboardState,
    getLatestDashboardState,
    canStoreSearchSession,
  });

  if (incomingEmbeddable?.searchSessionId) {
    session.continue(incomingEmbeddable?.searchSessionId);
  }

  const searchSessionIdFromURL = getSearchSessionIdFromURL(history);
  if (searchSessionIdFromURL) {
    session.restore(searchSessionIdFromURL);
  }

  const dashboardFactory = getEmbeddableFactory<
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
    incomingEmbeddable,
    searchSessionId,
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
          // even when we change embeddable type we should keep hidePanelTitles state
          // this is temporary, and only required because the key is stored in explicitInput
          // when it should be stored outside of it instead.
          ...(incomingEmbeddable.type === originalPanelState.type
            ? {
                ...originalPanelState.explicitInput,
              }
            : { hidePanelTitles: originalPanelState.explicitInput.hidePanelTitles }),
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
