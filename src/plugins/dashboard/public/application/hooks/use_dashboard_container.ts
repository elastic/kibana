/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { useEffect, useState } from 'react';
import _ from 'lodash';
import { History } from 'history';

import { useKibana } from '../../../../kibana_react/public';
import {
  ContainerOutput,
  EmbeddableFactoryNotFoundError,
  EmbeddableInput,
  isErrorEmbeddable,
} from '../../../../embeddable/public';

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

    // get incoming embeddable from the state transfer service.
    const incomingEmbeddable = embeddable
      .getStateTransfer(scopedHistory())
      .getIncomingEmbeddablePackage();

    (async function createContainer() {
      const newContainer = await dashboardFactory.create(
        getDashboardContainerInput({
          dashboardCapabilities,
          dashboardStateManager,
          incomingEmbeddable,
          isEmbeddedExternally,
          query,
          searchSessionId: searchSessionIdFromURL ?? searchSession.start(),
        })
      );

      if (!newContainer || isErrorEmbeddable(newContainer)) {
        return;
      }

      // If the incoming embeddable is newly created, or doesn't exist in the current panels list,
      // add it with `addNewEmbeddable`
      if (
        incomingEmbeddable &&
        (!incomingEmbeddable?.embeddableId ||
          (incomingEmbeddable.embeddableId &&
            !newContainer.getInput().panels[incomingEmbeddable.embeddableId]))
      ) {
        newContainer.addNewEmbeddable<EmbeddableInput>(
          incomingEmbeddable.type,
          incomingEmbeddable.input
        );
      }
      setDashboardContainer(newContainer);
      return () => setDashboardContainer(null);
    })();
  }, [
    dashboardCapabilities,
    dashboardStateManager,
    embeddable,
    history,
    isEmbeddedExternally,
    query,
    scopedHistory,
    searchSession,
  ]);

  return dashboardContainer;
};
