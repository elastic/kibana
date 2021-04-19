/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { DashboardSavedObject } from '../../saved_dashboards';
import { DashboardBuildContext, DashboardState } from '../../types';
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
import {
  DashboardContainer,
  DashboardContainerInput,
  DASHBOARD_CONTAINER_TYPE,
} from '../embeddable';

type BuildDashboardContainerProps = DashboardBuildContext & {
  savedDashboard: DashboardSavedObject;
  initialDashboardState: DashboardState;
  incomingEmbeddable?: EmbeddablePackageState;
};

/**
 * Builds the dashboard container and manages initial search session
 */
export const buildDashboardContainer = async ({
  getLatestDashboardState,
  initialDashboardState,
  isEmbeddedExternally,
  incomingEmbeddable,
  kbnUrlStateStorage,
  savedDashboard,
  services,
  history,
}: BuildDashboardContainerProps) => {
  const { data, embeddable, dashboardCapabilities } = services;
  const {
    search: { session },
  } = data;

  // set up search session
  enableDashboardSearchSessions({
    data,
    savedDashboard,
    initialDashboardState,
    getLatestDashboardState,
    canStoreSearchSession: dashboardCapabilities.storeSearchSession,
  });
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

  const initialInput = stateToDashboardContainerInput({
    searchSessionId: searchSessionIdFromURL ?? session.start(),
    isEmbeddedExternally: Boolean(isEmbeddedExternally),
    dashboardState: initialDashboardState,
    incomingEmbeddable,
    savedDashboard,
    services,
  });

  // If the incoming embeddable state's id already exists in the embeddables map, replace the input, retaining the existing gridData for that panel.
  if (incomingEmbeddable?.embeddableId && initialInput.panels[incomingEmbeddable.embeddableId]) {
    const originalPanelState = initialInput.panels[incomingEmbeddable.embeddableId];
    initialInput.panels[incomingEmbeddable.embeddableId] = {
      gridData: originalPanelState.gridData,
      type: incomingEmbeddable.type,
      explicitInput: {
        ...originalPanelState.explicitInput,
        ...incomingEmbeddable.input,
        id: incomingEmbeddable.embeddableId,
      },
    };
  }

  const dashboardContainer = await dashboardFactory.create(initialInput);
  if (!dashboardContainer || isErrorEmbeddable(dashboardContainer)) {
    tryDestroyDashboardContainer(dashboardContainer);
    return;
  }

  // If the incoming embeddable is newly created, or doesn't exist in the current panels list,
  // add it with `addNewEmbeddable`
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
