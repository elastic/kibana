/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { History } from 'history';
import useMount from 'react-use/lib/useMount';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { ViewMode } from '@kbn/embeddable-plugin/public';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { createKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';

import {
  DashboardAppNoDataPage,
  isDashboardAppInNoDataState,
} from './no_data/dashboard_app_no_data';
import {
  loadAndRemoveDashboardState,
  startSyncingDashboardUrlState,
} from './url/sync_dashboard_url_state';
import {
  getSessionURLObservable,
  getSearchSessionIdFromURL,
  removeSearchSessionIdFromURL,
  createSessionRestorationDataProvider,
} from './url/search_sessions_integration';
import { DASHBOARD_APP_ID } from '../dashboard_constants';
import { pluginServices } from '../services/plugin_services';
import { DashboardTopNav } from './top_nav/dashboard_top_nav';
import type { DashboardContainer } from '../dashboard_container';
import { type DashboardEmbedSettings, DashboardRedirect } from './types';
import { useDashboardMountContext } from './hooks/dashboard_mount_context';
import { useDashboardOutcomeValidation } from './hooks/use_dashboard_outcome_validation';
import DashboardContainerRenderer from '../dashboard_container/dashboard_container_renderer';
import { loadDashboardHistoryLocationState } from './locator/load_dashboard_history_location_state';
import type { DashboardCreationOptions } from '../dashboard_container/embeddable/dashboard_container_factory';

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
  const [showNoDataPage, setShowNoDataPage] = useState<boolean>(false);
  useMount(() => {
    (async () => setShowNoDataPage(await isDashboardAppInNoDataState()))();
  });

  const [dashboardContainer, setDashboardContainer] = useState<DashboardContainer | undefined>(
    undefined
  );

  /**
   * Unpack & set up dashboard services
   */
  const {
    screenshotMode: { isScreenshotMode, getScreenshotContext },
    coreContext: { executionContext },
    embeddable: { getStateTransfer },
    notifications: { toasts },
    settings: { uiSettings },
    data: { search },
  } = pluginServices.getServices();

  const incomingEmbeddable = getStateTransfer().getIncomingEmbeddablePackage(
    DASHBOARD_APP_ID,
    true
  );
  const { scopedHistory: getScopedHistory } = useDashboardMountContext();

  useExecutionContext(executionContext, {
    type: 'application',
    page: 'app',
    id: savedDashboardId || 'new',
  });

  const kbnUrlStateStorage = useMemo(
    () =>
      createKbnUrlStateStorage({
        history,
        useHash: uiSettings.get('state:storeInSessionStorage'),
        ...withNotifyOnErrors(toasts),
      }),
    [toasts, history, uiSettings]
  );

  /**
   * Clear search session when leaving dashboard route
   */
  useEffect(() => {
    return () => {
      search.session.clear();
    };
  }, [search.session]);

  /**
   * Validate saved object load outcome
   */
  const { validateOutcome, getLegacyConflictWarning } = useDashboardOutcomeValidation({
    redirectTo,
  });

  /**
   * Create options to pass into the dashboard renderer
   */
  const stateFromLocator = loadDashboardHistoryLocationState(getScopedHistory);
  const getCreationOptions = useCallback((): DashboardCreationOptions => {
    const initialUrlState = loadAndRemoveDashboardState(kbnUrlStateStorage);
    const searchSessionIdFromURL = getSearchSessionIdFromURL(history);

    return {
      incomingEmbeddable,

      // integrations
      useControlGroupIntegration: true,
      useSessionStorageIntegration: true,
      useUnifiedSearchIntegration: true,
      unifiedSearchSettings: {
        kbnUrlStateStorage,
      },
      useSearchSessionsIntegration: true,
      searchSessionSettings: {
        createSessionRestorationDataProvider,
        sessionIdToRestore: searchSessionIdFromURL,
        sessionIdUrlChangeObservable: getSessionURLObservable(history),
        getSearchSessionIdFromURL: () => getSearchSessionIdFromURL(history),
        removeSessionIdFromUrl: () => removeSearchSessionIdFromURL(kbnUrlStateStorage),
      },

      // Override all state with URL + Locator input
      overrideInput: {
        // State loaded from the dashboard app URL and from the locator overrides all other dashboard state.
        ...initialUrlState,
        ...stateFromLocator,

        // if print mode is active, force viewMode.PRINT
        ...(isScreenshotMode() && getScreenshotContext('layout') === 'print'
          ? { viewMode: ViewMode.PRINT }
          : {}),
      },

      validateLoadedSavedObject: validateOutcome,
    };
  }, [
    history,
    validateOutcome,
    stateFromLocator,
    isScreenshotMode,
    kbnUrlStateStorage,
    incomingEmbeddable,
    getScreenshotContext,
  ]);

  /**
   * Get the redux wrapper from the dashboard container. This is used to wrap the top nav so it can interact with the
   * dashboard's redux state.
   */
  const DashboardReduxWrapper = useMemo(
    () => dashboardContainer?.getReduxEmbeddableTools().Wrapper,
    [dashboardContainer]
  );

  /**
   * When the dashboard container is created, or re-created, start syncing dashboard state with the URL
   */
  useEffect(() => {
    if (!dashboardContainer) return;
    const { stopWatchingAppStateInUrl } = startSyncingDashboardUrlState({
      kbnUrlStateStorage,
      dashboardContainer,
    });
    return () => stopWatchingAppStateInUrl();
  }, [dashboardContainer, kbnUrlStateStorage]);

  return (
    <>
      {showNoDataPage && (
        <DashboardAppNoDataPage onDataViewCreated={() => setShowNoDataPage(false)} />
      )}
      {!showNoDataPage && (
        <>
          {DashboardReduxWrapper && (
            <DashboardReduxWrapper>
              <DashboardTopNav redirectTo={redirectTo} embedSettings={embedSettings} />
            </DashboardReduxWrapper>
          )}

          {getLegacyConflictWarning?.()}
          <DashboardContainerRenderer
            savedObjectId={savedDashboardId}
            getCreationOptions={getCreationOptions}
            onDashboardContainerLoaded={(container) => setDashboardContainer(container)}
          />
        </>
      )}
    </>
  );
}
