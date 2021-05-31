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
  EmbeddablePackageState,
  ErrorEmbeddable,
  isErrorEmbeddable,
  ViewMode,
} from '../../services/embeddable';

import { DashboardStateManager } from '../dashboard_state_manager';
import { getDashboardContainerInput, getSearchSessionIdFromURL } from '../dashboard_app_functions';
import { DashboardContainer, DashboardContainerInput } from '../..';
import { DashboardAppServices } from '../types';
import { DASHBOARD_CONTAINER_TYPE } from '..';
import { TimefilterContract } from '../../services/data';

export const useDashboardContainer = ({
  history,
  timeFilter,
  setUnsavedChanges,
  getIncomingEmbeddable,
  dashboardStateManager,
  isEmbeddedExternally,
}: {
  history: History;
  isEmbeddedExternally?: boolean;
  timeFilter?: TimefilterContract;
  setUnsavedChanges?: (dirty: boolean) => void;
  dashboardStateManager: DashboardStateManager | null;
  getIncomingEmbeddable: (removeAfterFetch?: boolean) => EmbeddablePackageState | undefined;
}) => {
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

    const incomingEmbeddable = getIncomingEmbeddable(true);

    let canceled = false;
    let pendingContainer: DashboardContainer | ErrorEmbeddable | null | undefined;
    (async function createContainer() {
      const existingSession = searchSession.getSessionId();
      pendingContainer = await dashboardFactory.create(
        getDashboardContainerInput({
          isEmbeddedExternally: Boolean(isEmbeddedExternally),
          dashboardCapabilities,
          dashboardStateManager,
          incomingEmbeddable,
          query,
          searchSessionId:
            searchSessionIdFromURL ??
            (existingSession && incomingEmbeddable ? existingSession : searchSession.start()),
        })
      );

      // already new container is being created
      // no longer interested in the pending one
      if (canceled) {
        try {
          pendingContainer?.destroy();
          pendingContainer = null;
        } catch (e) {
          // destroy could throw if something has already destroyed the container
          // eslint-disable-next-line no-console
          console.warn(e);
        }

        return;
      }

      if (!pendingContainer || isErrorEmbeddable(pendingContainer)) {
        return;
      }

      // inject switch view mode callback for the empty screen to use
      pendingContainer.switchViewMode = (newViewMode: ViewMode) =>
        dashboardStateManager.switchViewMode(newViewMode);

      // If the incoming embeddable is newly created, or doesn't exist in the current panels list,
      // add it with `addNewEmbeddable`
      if (
        incomingEmbeddable &&
        (!incomingEmbeddable?.embeddableId ||
          (incomingEmbeddable.embeddableId &&
            !pendingContainer.getInput().panels[incomingEmbeddable.embeddableId]))
      ) {
        pendingContainer.addNewEmbeddable<EmbeddableInput>(
          incomingEmbeddable.type,
          incomingEmbeddable.input
        );
      }
      setDashboardContainer(pendingContainer);
      setUnsavedChanges?.(dashboardStateManager.getIsDirty(data.query.timefilter.timefilter));
    })();
    return () => {
      canceled = true;
      try {
        pendingContainer?.destroy();
      } catch (e) {
        // destroy could throw if something has already destroyed the container
        // eslint-disable-next-line no-console
        console.warn(e);
      }

      setDashboardContainer(null);
    };
  }, [
    data.query.timefilter.timefilter,
    dashboardCapabilities,
    dashboardStateManager,
    getIncomingEmbeddable,
    isEmbeddedExternally,
    setUnsavedChanges,
    searchSession,
    scopedHistory,
    timeFilter,
    embeddable,
    history,
    query,
  ]);

  return dashboardContainer;
};
