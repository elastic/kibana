/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useState } from 'react';
import { History } from 'history';

import { useKibana } from '../../services/kibana_react';
import {
  ContainerOutput,
  EmbeddableFactoryNotFoundError,
  EmbeddableInput,
  ErrorEmbeddable,
  isErrorEmbeddable,
  ViewMode,
} from '../../services/embeddable';

import { DashboardStateManager } from '../dashboard_state_manager';
import { getDashboardContainerInput, getSearchSessionIdFromURL } from '../dashboard_app_functions';
import { DashboardContainer, DashboardContainerInput } from '../..';
import { DashboardAppServices } from '../types';
import { DASHBOARD_CONTAINER_TYPE } from '..';

export const useDashboardContainer = (
  dashboardStateManager: DashboardStateManager | null,
  history: History,
  isEmbeddedExternally: boolean
) => {
  const {
    dashboardCapabilities,
    data,
    embeddable,
    scopedHistory,
  } = useKibana<DashboardAppServices>().services;

  // Destructure and rename services; makes the Effect hook more specific, makes later
  // abstraction of service dependencies easier.
  const { query } = data;
  const { session: searchSession } = data.search;

  const [dashboardContainer, setDashboardContainer] = useState<DashboardContainer | null>(null);

  useEffect(() => {
    if (!dashboardStateManager) {
      return;
    }

    // Load dashboard container
    const dashboardFactory = embeddable.getEmbeddableFactory<
      DashboardContainerInput,
      ContainerOutput,
      DashboardContainer
    >(DASHBOARD_CONTAINER_TYPE);

    if (!dashboardFactory) {
      throw new EmbeddableFactoryNotFoundError(
        'dashboard app requires dashboard embeddable factory'
      );
    }

    const searchSessionIdFromURL = getSearchSessionIdFromURL(history);

    if (searchSessionIdFromURL) {
      searchSession.restore(searchSessionIdFromURL);
    }

    const incomingEmbeddable = embeddable.getStateTransfer().getIncomingEmbeddablePackage(true);

    let canceled = false;
    let newContainer: DashboardContainer | ErrorEmbeddable | null | undefined;
    (async function createContainer() {
      newContainer = await dashboardFactory.create(
        getDashboardContainerInput({
          dashboardCapabilities,
          dashboardStateManager,
          incomingEmbeddable,
          isEmbeddedExternally,
          query,
          searchSessionId: searchSessionIdFromURL ?? searchSession.start(),
        })
      );

      // already new container is being created
      // no longer interested in current one
      if (canceled) {
        try {
          newContainer?.destroy();
        } catch (e) {
          // destroy could throw if something has already destroyed the container
          // eslint-disable-next-line no-console
          console.warn(e);
        }

        return;
      }

      if (!newContainer || isErrorEmbeddable(newContainer)) {
        return;
      }

      // inject switch view mode callback for the empty screen to use
      newContainer.switchViewMode = (newViewMode: ViewMode) =>
        dashboardStateManager.switchViewMode(newViewMode);

      // If the incoming embeddable is newly created, or doesn't exist in the current panels list,
      // add it with `addNewEmbeddable`
      if (
        incomingEmbeddable &&
        (!incomingEmbeddable?.embeddableId ||
          (incomingEmbeddable.embeddableId &&
            !newContainer.getInput().panels[incomingEmbeddable.embeddableId]))
      ) {
        dashboardStateManager.switchViewMode(ViewMode.EDIT);
        newContainer.addNewEmbeddable<EmbeddableInput>(
          incomingEmbeddable.type,
          incomingEmbeddable.input
        );
      }
      setDashboardContainer(newContainer);
    })();
    return () => {
      canceled = true;
      try {
        newContainer?.destroy();
      } catch (e) {
        // destroy could throw if something has already destroyed the container
        // eslint-disable-next-line no-console
        console.warn(e);
      }

      setDashboardContainer(null);
    };
  }, [
    dashboardCapabilities,
    dashboardStateManager,
    isEmbeddedExternally,
    searchSession,
    scopedHistory,
    embeddable,
    history,
    query,
  ]);

  return dashboardContainer;
};
