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

import _ from 'lodash';
import { History } from 'history';
import { useEffect, useState } from 'react';
import { DashboardContainer, DashboardContainerInput, DASHBOARD_CONTAINER_TYPE } from '../..';
import { DashboardAppServices, DashboardEmbedSettings } from '../types';
import { DashboardStateManager } from '../dashboard_state_manager';
import {
  ContainerOutput,
  EmbeddableFactoryNotFoundError,
  EmbeddableInput,
  ErrorEmbeddable,
  isErrorEmbeddable,
} from '../../../../embeddable/public';
import { getDashboardContainerInput, getSearchSessionIdFromURL } from '../dashboard_app_functions';

export function useDashboardContainer(
  services: DashboardAppServices,
  history: History,
  embedSettings?: DashboardEmbedSettings,
  dashboardStateManager?: DashboardStateManager
) {
  const [dashboardContainer, setDashboardContainer] = useState<DashboardContainer>();

  useEffect(() => {
    if (!dashboardStateManager) {
      return;
    }

    const {
      embeddable,
      scopedHistory,
      dashboardCapabilities,
      data: { search, query },
    } = services;

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
      search.session.restore(searchSessionIdFromURL);
    }
    // get incoming embeddable from the state transfer service.
    const incomingEmbeddable = embeddable
      .getStateTransfer(scopedHistory())
      .getIncomingEmbeddablePackage();

    dashboardFactory
      .create(
        getDashboardContainerInput({
          searchSessionId: searchSessionIdFromURL ?? search.session.start(),
          isEmbeddedExternally: Boolean(embedSettings),
          dashboardStateManager,
          dashboardCapabilities,
          incomingEmbeddable,
          query,
        })
      )
      .then((newDashboardContainer: DashboardContainer | ErrorEmbeddable | undefined) => {
        if (!newDashboardContainer || isErrorEmbeddable(newDashboardContainer)) {
          return;
        }

        // If the incoming embeddable is newly created, or doesn't exist in the current panels list, add it with `addNewEmbeddable`
        if (
          incomingEmbeddable &&
          (!incomingEmbeddable?.embeddableId ||
            (incomingEmbeddable.embeddableId &&
              !newDashboardContainer.getInput().panels[incomingEmbeddable.embeddableId]))
        ) {
          newDashboardContainer.addNewEmbeddable<EmbeddableInput>(
            incomingEmbeddable.type,
            incomingEmbeddable.input
          );
        }
        setDashboardContainer(newDashboardContainer);
      });
    return () => {
      setDashboardContainer((currentContainer) => {
        currentContainer?.destroy();
        return undefined;
      });
    };
  }, [dashboardStateManager, services, history, embedSettings]);

  return dashboardContainer;
}
