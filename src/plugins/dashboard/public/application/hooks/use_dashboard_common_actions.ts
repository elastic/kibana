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

import { useCallback } from 'react';
import { History } from 'history';
import { DashboardAppServices, DashboardEmbedSettings } from '../types';
import { DashboardStateManager } from '../dashboard_state_manager';
import {
  getChangesFromAppStateForContainerState,
  getDashboardContainerInput,
  getSearchSessionIdFromURL,
} from '../dashboard_app_functions';
import { removeQueryParam } from '../../../../kibana_utils/public';
import { DashboardConstants } from '../..';
import {
  EmbeddableFactoryNotFoundError,
  isErrorEmbeddable,
  openAddPanelFlyout,
  ViewMode,
} from '../../../../embeddable/public';
import { getSavedObjectFinder } from '../../../../saved_objects/public';
import { DashboardContainer } from '..';

export function useDashboardCommonActions(
  services: DashboardAppServices,
  history: History,
  dashboardContainer?: DashboardContainer,
  dashboardStateManager?: DashboardStateManager,
  embedSettings?: DashboardEmbedSettings
) {
  const refreshDashboardContainer = useCallback(
    (lastReloadRequestTime?: number) => {
      if (!dashboardContainer || !dashboardStateManager) {
        return;
      }
      const {
        dashboardCapabilities,
        data: { search, query },
      } = services;
      const changes = getChangesFromAppStateForContainerState({
        dashboardContainer,
        appStateDashboardInput: getDashboardContainerInput({
          isEmbeddedExternally: Boolean(embedSettings),
          dashboardStateManager,
          lastReloadRequestTime,
          dashboardCapabilities,
          query,
        }),
      });
      if (changes) {
        if (getSearchSessionIdFromURL(history)) {
          // going away from a background search results
          removeQueryParam(history, DashboardConstants.SEARCH_SESSION_ID, true);
        }

        dashboardContainer.updateInput({
          ...changes,
          searchSessionId: search.session.start(),
        });
      }
    },
    [history, services, embedSettings, dashboardContainer, dashboardStateManager]
  );

  const addFromLibrary = useCallback(() => {
    if (dashboardContainer && !isErrorEmbeddable(dashboardContainer)) {
      const { embeddable, core, uiSettings } = services;
      openAddPanelFlyout({
        embeddable: dashboardContainer,
        getAllFactories: embeddable.getEmbeddableFactories,
        getFactory: embeddable.getEmbeddableFactory,
        notifications: core.notifications,
        overlays: core.overlays,
        SavedObjectFinder: getSavedObjectFinder(core.savedObjects, uiSettings),
      });
    }
  }, [dashboardContainer, services]);

  const createNew = useCallback(async () => {
    const { embeddable } = services;
    const type = 'visualization';
    const factory = embeddable.getEmbeddableFactory(type);
    if (!factory) {
      throw new EmbeddableFactoryNotFoundError(type);
    }
    const explicitInput = await factory.getExplicitInput();
    await dashboardContainer?.addNewEmbeddable(type, explicitInput);
  }, [dashboardContainer, services]);

  const updateViewMode = useCallback(
    (newMode: ViewMode) => {
      dashboardStateManager?.switchViewMode(newMode);
    },
    [dashboardStateManager]
  );

  return { createNew, updateViewMode, addFromLibrary, refreshDashboardContainer };
}
