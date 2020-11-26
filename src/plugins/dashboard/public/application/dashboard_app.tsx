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
import ReactDOM from 'react-dom';
import { History } from 'history';
import { merge, Subscription } from 'rxjs';
import React, { useEffect, useState } from 'react';
import { EUI_MODAL_CANCEL_BUTTON } from '@elastic/eui';

import { IndexPattern } from '../../../data/public';
import { ViewMode } from '../../../embeddable/public';
import { useKibana } from '../../../kibana_react/public';
import { DashboardSavedObject } from '../saved_dashboards';
import { DashboardTopNav } from './top_nav/dashboard_top_nav';
import { useSavedDashboard } from './hooks/use_saved_dashboard';
import { DashboardStateManager } from './dashboard_state_manager';
import { useDashboardContainer } from './hooks/use_dashboard_container';
import { DashboardEmptyScreen } from './empty_screen/dashboard_empty_screen';
import { useDashboardStateManager } from './hooks/use_dashboard_state_manager';
import { useDashboardCommonActions } from './hooks/use_dashboard_common_actions';
import { DashboardAppServices, DashboardEmbedSettings, DashboardRedirect } from './types';
import { dashboardBreadcrumb, getDashboardTitle, leaveConfirmStrings } from './dashboard_strings';
import {
  getFiltersSubscription,
  getInputSubscription,
  getOutputSubscription,
} from './dashboard_app_functions';
import { DashboardContainer } from '..';

export interface DashboardAppComponentState {
  dashboardStateManager?: DashboardStateManager;
  dashboardContainer?: DashboardContainer;
  savedDashboard?: DashboardSavedObject;
  indexPatterns?: IndexPattern[];
}

export interface DashboardAppProps {
  history: History;
  savedDashboardId?: string;
  redirectTo: DashboardRedirect;
  embedSettings?: DashboardEmbedSettings;
}

export function DashboardApp({
  savedDashboardId,
  embedSettings,
  redirectTo,
  history,
}: DashboardAppProps) {
  const [dashboardIndexPatterns, setDashboardIndexPatterns] = useState<IndexPattern[]>([]);
  const [lastReloadTime, setLastReloadTime] = useState(0);

  const services = useKibana<DashboardAppServices>().services;

  const savedDashboard = useSavedDashboard(services, history, savedDashboardId);
  const dashboardStateManager = useDashboardStateManager(services, history, savedDashboard);
  const dashboardContainer = useDashboardContainer(
    services,
    history,
    embedSettings,
    dashboardStateManager
  );

  const {
    createNew,
    updateViewMode,
    addFromLibrary,
    refreshDashboardContainer,
  } = useDashboardCommonActions(
    services,
    history,
    dashboardContainer,
    dashboardStateManager,
    embedSettings
  );

  // Render Dashboard Container and manage subscriptions
  useEffect(() => {
    if (!dashboardStateManager || !dashboardContainer) {
      return;
    }

    const {
      uiSettings,
      indexPatterns,
      core: { http },
      data: { query },
    } = services;

    const timeFilter = query.timefilter.timefilter;
    const subscriptions = new Subscription();

    subscriptions.add(
      getInputSubscription({
        dashboardContainer,
        dashboardStateManager,
        filterManager: query.filterManager,
      })
    );
    subscriptions.add(
      getOutputSubscription({
        dashboardContainer,
        indexPatterns,
        onUpdateIndexPatterns: (newIndexPatterns) => setDashboardIndexPatterns(newIndexPatterns),
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
          isReadonlyMode={dashboardContainer.getInput().dashboardCapabilities?.hideWriteControls}
          onLinkClick={isEditMode ? addFromLibrary : () => updateViewMode(ViewMode.EDIT)}
          showLinkToVisualize={isEditMode}
          onVisualizeClick={createNew}
          uiSettings={uiSettings}
          http={http}
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
    services,
    createNew,
    addFromLibrary,
    updateViewMode,
    dashboardContainer,
    dashboardStateManager,
    refreshDashboardContainer,
  ]);

  // Sync breadcrumbs when Dashboard State Manager changes
  useEffect(() => {
    if (!dashboardStateManager) {
      return;
    }

    const {
      chrome,
      data: { query },
      core: { overlays },
    } = services;

    chrome.setBreadcrumbs([
      {
        text: dashboardBreadcrumb,
        'data-test-subj': 'dashboardListingBreadcrumb',
        onClick: () => {
          if (dashboardStateManager.getIsDirty()) {
            overlays
              .openConfirm(leaveConfirmStrings.leaveSubtitle, {
                confirmButtonText: leaveConfirmStrings.confirmButtonText,
                cancelButtonText: leaveConfirmStrings.cancelButtonText,
                defaultFocusedButton: EUI_MODAL_CANCEL_BUTTON,
                title: leaveConfirmStrings.leaveTitle,
              })
              .then((isConfirmed) => {
                if (isConfirmed) {
                  redirectTo({ destination: 'listing' });
                }
              });
          } else {
            redirectTo({ destination: 'listing' });
          }
        },
      },
      {
        text: getDashboardTitle(
          dashboardStateManager.getTitle(),
          dashboardStateManager.getViewMode(),
          dashboardStateManager.getIsDirty(query.timefilter.timefilter),
          dashboardStateManager.isNew()
        ),
      },
    ]);
  }, [dashboardStateManager, redirectTo, services]);

  // Build onAppLeave when Dashboard State Manager changes
  useEffect(() => {
    if (!dashboardStateManager || !dashboardContainer) {
      return;
    }
    const { onAppLeave } = services;
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
  }, [dashboardStateManager, dashboardContainer, services]);

  // Refresh the dashboard container when lastReloadTime changes
  useEffect(() => {
    refreshDashboardContainer(lastReloadTime);
  }, [lastReloadTime, refreshDashboardContainer]);

  return (
    <div className="app-container dshAppContainer">
      {dashboardIndexPatterns && dashboardContainer && dashboardStateManager && savedDashboard && (
        <DashboardTopNav
          createNew={createNew}
          redirectTo={redirectTo}
          embedSettings={embedSettings}
          updateViewMode={updateViewMode}
          addFromLibrary={addFromLibrary}
          lastDashboardId={savedDashboardId}
          indexPatterns={dashboardIndexPatterns}
          savedDashboard={savedDashboard}
          timefilter={services.data.query.timefilter.timefilter}
          dashboardContainer={dashboardContainer}
          dashboardStateManager={dashboardStateManager}
          onQuerySubmit={(_payload, isUpdate) => {
            if (isUpdate === false) {
              // The user can still request a reload in the query bar, even if the
              // query is the same, and in that case, we have to explicitly ask for
              // a reload, since no state changes will cause it.
              setLastReloadTime(() => new Date().getTime());
            }
          }}
        />
      )}
      <div id="dashboardViewport" />
    </div>
  );
}
