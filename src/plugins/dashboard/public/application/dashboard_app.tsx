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

import React, { useEffect, useCallback, useState } from 'react';
import { History } from 'history';
import ReactDOM from 'react-dom';
import _ from 'lodash';
import { merge, Subscription } from 'rxjs';

import { getSavedObjectFinder } from '../../../saved_objects/public';
import { removeQueryParam } from '../../../kibana_utils/public';
import { useKibana } from '../../../kibana_react/public';
import { IndexPattern } from '../../../data/public';
import {
  EmbeddableFactoryNotFoundError,
  isErrorEmbeddable,
  openAddPanelFlyout,
  ViewMode,
} from '../../../embeddable/public';

import { DashboardTopNav } from './top_nav/dashboard_top_nav';
import { DashboardEmptyScreen } from './empty_screen/dashboard_empty_screen';
import {
  getChangesFromAppStateForContainerState,
  getDashboardContainerInput,
  getFiltersSubscription,
  getInputSubscription,
  getOutputSubscription,
  getSearchSessionIdFromURL,
} from './dashboard_app_functions';
import {
  useLoadSavedDashboard,
  useDashboardStateManager,
  useDashboardContainer,
  useDashboardBreadcrumbs,
} from './hooks';
import { DashboardAppServices, DashboardEmbedSettings, DashboardRedirect } from './types';
import { DashboardConstants } from '..';

export interface DashboardAppProps {
  embedSettings?: DashboardEmbedSettings;
  history: History;
  redirectTo: DashboardRedirect;
  savedDashboardId?: string;
}

export function DashboardApp({
  embedSettings,
  history,
  redirectTo,
  savedDashboardId,
}: DashboardAppProps) {
  const {
    core,
    dashboardCapabilities,
    data,
    embeddable,
    indexPatterns: indexPatternsService,
    onAppLeave,
    uiSettings,
  } = useKibana<DashboardAppServices>().services;

  // Destructure and rename services; makes the Effect hooks more specific, makes later
  // abstraction of service dependencies easier.
  const { http, notifications, overlays, savedObjects } = core;
  const { query, search } = data;
  const { filterManager } = query;
  const { timefilter: timeFilter } = query.timefilter;
  const { session: searchSession } = search;

  const isEmbeddedExternally = !!embedSettings;

  // Add Dashboard Hooks
  const savedDashboard = useLoadSavedDashboard(savedDashboardId, history);
  const dashboardStateManager = useDashboardStateManager(savedDashboard, history);
  const dashboardContainer = useDashboardContainer(
    dashboardStateManager,
    history,
    isEmbeddedExternally
  );
  useDashboardBreadcrumbs(dashboardStateManager, redirectTo);

  const [indexPatterns, setIndexPatterns] = useState<IndexPattern[]>([]);
  const [lastReloadTime, setLastReloadTime] = useState(0);

  const refreshDashboardContainer = useCallback(
    (lastReloadRequestTime?: number) => {
      if (!dashboardContainer || !dashboardStateManager) {
        return;
      }

      const changes = getChangesFromAppStateForContainerState({
        dashboardContainer,
        appStateDashboardInput: getDashboardContainerInput({
          dashboardCapabilities,
          dashboardStateManager,
          isEmbeddedExternally,
          lastReloadRequestTime,
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
          searchSessionId: searchSession.start(),
        });
      }
    },
    [
      dashboardCapabilities,
      dashboardContainer,
      dashboardStateManager,
      history,
      isEmbeddedExternally,
      query,
      searchSession,
    ]
  );

  const addFromLibrary = useCallback(() => {
    if (dashboardContainer && !isErrorEmbeddable(dashboardContainer)) {
      openAddPanelFlyout({
        embeddable: dashboardContainer,
        getAllFactories: embeddable.getEmbeddableFactories,
        getFactory: embeddable.getEmbeddableFactory,
        notifications,
        overlays,
        SavedObjectFinder: getSavedObjectFinder(savedObjects, uiSettings),
      });
    }
  }, [dashboardContainer, embeddable, notifications, overlays, savedObjects, uiSettings]);

  const createNew = useCallback(async () => {
    const type = 'visualization';
    const factory = embeddable.getEmbeddableFactory(type);

    if (!factory) {
      throw new EmbeddableFactoryNotFoundError(type);
    }

    const explicitInput = await factory.getExplicitInput();

    if (dashboardContainer) {
      await dashboardContainer.addNewEmbeddable(type, explicitInput);
    }
  }, [dashboardContainer, embeddable]);

  const updateViewMode = useCallback(
    (newMode: ViewMode) => {
      if (dashboardStateManager) {
        dashboardStateManager.switchViewMode(newMode);
      }
    },
    [dashboardStateManager]
  );

  // Render Dashboard Container and manage subscriptions
  useEffect(() => {
    if (!dashboardStateManager || !dashboardContainer) {
      return;
    }

    const subscriptions = new Subscription();

    subscriptions.add(
      getInputSubscription({
        dashboardContainer,
        dashboardStateManager,
        filterManager,
      })
    );

    subscriptions.add(
      getOutputSubscription({
        dashboardContainer,
        indexPatterns: indexPatternsService,
        onUpdateIndexPatterns: (newIndexPatterns) => setIndexPatterns(newIndexPatterns),
      })
    );

    subscriptions.add(
      getFiltersSubscription({
        query,
        dashboardStateManager,
      })
    );

    subscriptions.add(
      merge(
        ...[timeFilter.getRefreshIntervalUpdate$(), timeFilter.getTimeUpdate$()]
      ).subscribe(() => refreshDashboardContainer())
    );

    subscriptions.add(
      searchSession.onRefresh$.subscribe(() => {
        setLastReloadTime(() => new Date().getTime());
      })
    );

    dashboardStateManager.registerChangeListener(() => {
      // we aren't checking dirty state because there are changes the container needs to know about
      // that won't make the dashboard "dirty" - like a view mode change.
      refreshDashboardContainer();
    });

    const dashboardViewport = document.getElementById('dashboardViewport');

    dashboardContainer.renderEmptyScreen = () => {
      const isEditMode = dashboardContainer.getInput().viewMode !== ViewMode.VIEW;

      return (
        <DashboardEmptyScreen
          http={http}
          isReadonlyMode={dashboardContainer.getInput().dashboardCapabilities?.hideWriteControls}
          onLinkClick={isEditMode ? addFromLibrary : () => updateViewMode(ViewMode.EDIT)}
          onVisualizeClick={createNew}
          showLinkToVisualize={isEditMode}
          uiSettings={uiSettings}
        />
      );
    };

    if (dashboardViewport) {
      dashboardContainer.render(dashboardViewport);
    }

    return () => {
      if (dashboardViewport) {
        ReactDOM.unmountComponentAtNode(dashboardViewport);
      }
      subscriptions.unsubscribe();
    };
  }, [
    addFromLibrary,
    createNew,
    dashboardContainer,
    dashboardStateManager,
    filterManager,
    http,
    indexPatternsService,
    query,
    refreshDashboardContainer,
    searchSession,
    timeFilter,
    uiSettings,
    updateViewMode,
  ]);

  // Build onAppLeave when Dashboard State Manager changes
  useEffect(() => {
    if (!dashboardStateManager || !dashboardContainer) {
      return;
    }

    onAppLeave((actions) => {
      if (dashboardStateManager?.getIsDirty() && !dashboardContainer?.skipWarningOnAppLeave) {
        // TODO: Finish App leave handler with overrides when redirecting to an editor.
        // return actions.confirm(leaveConfirmStrings.leaveSubtitle, leaveConfirmStrings.leaveTitle);
      }
      return actions.default();
    });

    return () => {
      // reset on app leave handler so the listing page doesn't trigger a confirmation
      onAppLeave((actions) => actions.default());
    };
  }, [dashboardStateManager, dashboardContainer, onAppLeave]);

  // Refresh the dashboard container when lastReloadTime changes
  useEffect(() => {
    refreshDashboardContainer(lastReloadTime);
  }, [lastReloadTime, refreshDashboardContainer]);

  return (
    <div className="app-container dshAppContainer">
      {dashboardContainer && dashboardStateManager && savedDashboard && (
        <DashboardTopNav
          lastDashboardId={savedDashboardId}
          timefilter={timeFilter}
          onQuerySubmit={(_payload, isUpdate) => {
            if (isUpdate === false) {
              // The user can still request a reload in the query bar, even if the
              // query is the same, and in that case, we have to explicitly ask for
              // a reload, since no state changes will cause it.
              setLastReloadTime(() => new Date().getTime());
            }
          }}
          {...{
            addFromLibrary,
            createNew,
            dashboardContainer,
            dashboardStateManager,
            embedSettings,
            indexPatterns,
            redirectTo,
            savedDashboard,
            updateViewMode,
          }}
        />
      )}
      <div id="dashboardViewport" />
    </div>
  );
}
