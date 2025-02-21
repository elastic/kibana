/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { History } from 'history';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { debounceTime } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { createKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import { ViewMode } from '@kbn/presentation-publishing';
import { DashboardApi, DashboardCreationOptions } from '..';
import { DASHBOARD_APP_ID } from '../plugin_constants';
import { DashboardRedirect } from '../dashboard_container/types';
import { DashboardTopNav } from '../dashboard_top_nav';
import {
  coreServices,
  dataService,
  embeddableService,
  screenshotModeService,
  shareService,
} from '../services/kibana_services';
import { useDashboardMountContext } from './hooks/dashboard_mount_context';
import { useDashboardOutcomeValidation } from './hooks/use_dashboard_outcome_validation';
import { useObservabilityAIAssistantContext } from './hooks/use_observability_ai_assistant_context';
import { loadDashboardHistoryLocationState } from './locator/load_dashboard_history_location_state';
import {
  DashboardAppNoDataPage,
  isDashboardAppInNoDataState,
} from './no_data/dashboard_app_no_data';
import { DashboardTabTitleSetter } from './tab_title_setter/dashboard_tab_title_setter';
import { type DashboardEmbedSettings } from './types';
import {
  createSessionRestorationDataProvider,
  getSearchSessionIdFromURL,
  getSessionURLObservable,
  removeSearchSessionIdFromURL,
} from './url/search_sessions_integration';
import {
  loadAndRemoveDashboardState,
  startSyncingExpandedPanelState,
  type SharedDashboardState,
} from './url/url_utils';
import { DashboardRenderer } from '../dashboard_container/external_api/dashboard_renderer';
import { DASHBOARD_STATE_STORAGE_KEY, createDashboardEditUrl } from '../utils/urls';

export interface DashboardAppProps {
  history: History;
  savedDashboardId?: string;
  redirectTo: DashboardRedirect;
  embedSettings?: DashboardEmbedSettings;
  expandedPanelId?: string;
}

export function DashboardApp({
  savedDashboardId,
  embedSettings,
  redirectTo,
  history,
  expandedPanelId,
}: DashboardAppProps) {
  const [showNoDataPage, setShowNoDataPage] = useState<boolean>(false);
  const [regenerateId, setRegenerateId] = useState(uuidv4());
  const incomingEmbeddable = useMemo(() => {
    return embeddableService
      .getStateTransfer()
      .getIncomingEmbeddablePackage(DASHBOARD_APP_ID, true);
  }, []);

  useEffect(() => {
    let canceled = false;
    // show dashboard when there is an incoming embeddable
    if (incomingEmbeddable) {
      return;
    }

    isDashboardAppInNoDataState()
      .then((isInNotDataState) => {
        if (!canceled && isInNotDataState) {
          setShowNoDataPage(true);
        }
      })
      .catch((error) => {
        // show dashboard application if inNoDataState can not be determined
      });

    return () => {
      canceled = true;
    };
  }, [incomingEmbeddable]);
  const [dashboardApi, setDashboardApi] = useState<DashboardApi | undefined>(undefined);

  const showPlainSpinner = useObservable(coreServices.customBranding.hasCustomBranding$, false);

  const { scopedHistory: getScopedHistory } = useDashboardMountContext();

  useObservabilityAIAssistantContext({
    dashboardApi,
  });

  useExecutionContext(coreServices.executionContext, {
    type: 'application',
    page: 'app',
    id: savedDashboardId || 'new',
  });

  const kbnUrlStateStorage = useMemo(
    () =>
      createKbnUrlStateStorage({
        history,
        useHash: coreServices.uiSettings.get('state:storeInSessionStorage'),
        ...withNotifyOnErrors(coreServices.notifications.toasts),
      }),
    [history]
  );

  /**
   * Clear search session when leaving dashboard route
   */
  useEffect(() => {
    return () => {
      dataService.search.session.clear();
    };
  }, []);

  /**
   * Validate saved object load outcome
   */
  const { validateOutcome, getLegacyConflictWarning } = useDashboardOutcomeValidation();

  /**
   * Create options to pass into the dashboard renderer
   */
  const getCreationOptions = useCallback((): Promise<DashboardCreationOptions> => {
    const searchSessionIdFromURL = getSearchSessionIdFromURL(history);
    const getInitialInput = () => {
      const stateFromLocator = loadDashboardHistoryLocationState(getScopedHistory);
      const initialUrlState = loadAndRemoveDashboardState(kbnUrlStateStorage);

      // Override all state with URL + Locator input
      return {
        // State loaded from the dashboard app URL and from the locator overrides all other dashboard state.
        ...initialUrlState,
        ...stateFromLocator,

        // if print mode is active, force viewMode.PRINT
        ...(screenshotModeService.isScreenshotMode() &&
        screenshotModeService.getScreenshotContext('layout') === 'print'
          ? { viewMode: 'print' as ViewMode }
          : {}),
      };
    };

    return Promise.resolve<DashboardCreationOptions>({
      getIncomingEmbeddable: () => incomingEmbeddable,

      // integrations
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
      getInitialInput,
      validateLoadedSavedObject: validateOutcome,
      fullScreenMode:
        kbnUrlStateStorage.get<{ fullScreenMode?: boolean }>(DASHBOARD_STATE_STORAGE_KEY)
          ?.fullScreenMode ?? false,
      isEmbeddedExternally: Boolean(embedSettings), // embed settings are only sent if the dashboard URL has `embed=true`
      getEmbeddableAppContext: (dashboardId) => ({
        currentAppId: DASHBOARD_APP_ID,
        getCurrentPath: () => `#${createDashboardEditUrl(dashboardId)}`,
      }),
    });
  }, [
    history,
    embedSettings,
    validateOutcome,
    getScopedHistory,
    kbnUrlStateStorage,
    incomingEmbeddable,
  ]);

  useEffect(() => {
    if (!dashboardApi) return;
    const { stopWatchingExpandedPanel } = startSyncingExpandedPanelState({ dashboardApi, history });
    return () => stopWatchingExpandedPanel();
  }, [dashboardApi, history]);

  /**
   * When the dashboard container is created, or re-created, start syncing dashboard state with the URL
   */
  useEffect(() => {
    if (!dashboardApi) return;
    const appStateSubscription = kbnUrlStateStorage
      .change$(DASHBOARD_STATE_STORAGE_KEY)
      .pipe(debounceTime(10)) // debounce URL updates so react has time to unsubscribe when changing URLs
      .subscribe(() => {
        const rawAppStateInUrl = kbnUrlStateStorage.get<SharedDashboardState>(
          DASHBOARD_STATE_STORAGE_KEY
        );
        if (rawAppStateInUrl) setRegenerateId(uuidv4());
      });
    return () => appStateSubscription.unsubscribe();
  }, [dashboardApi, kbnUrlStateStorage, savedDashboardId]);

  const locator = useMemo(() => shareService?.url.locators.get(DASHBOARD_APP_LOCATOR), []);

  return showNoDataPage ? (
    <DashboardAppNoDataPage onDataViewCreated={() => setShowNoDataPage(false)} />
  ) : (
    <>
      {dashboardApi && (
        <>
          <DashboardTabTitleSetter dashboardApi={dashboardApi} />
          <DashboardTopNav
            redirectTo={redirectTo}
            embedSettings={embedSettings}
            dashboardApi={dashboardApi}
          />
        </>
      )}

      {getLegacyConflictWarning?.()}
      <DashboardRenderer
        key={regenerateId}
        locator={locator}
        onApiAvailable={(dashboard) => {
          if (dashboard && !dashboardApi) {
            setDashboardApi(dashboard);
            if (expandedPanelId) {
              dashboard?.expandPanel(expandedPanelId);
            }
          }
        }}
        dashboardRedirect={redirectTo}
        savedObjectId={savedDashboardId}
        showPlainSpinner={showPlainSpinner}
        getCreationOptions={getCreationOptions}
      />
    </>
  );
}
