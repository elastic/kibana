/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import { History } from 'history';
import useMount from 'react-use/lib/useMount';
import useObservable from 'react-use/lib/useObservable';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { ViewMode } from '@kbn/embeddable-plugin/public';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { createKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';

import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { debounceTime } from 'rxjs';
import {
  DashboardAppNoDataPage,
  isDashboardAppInNoDataState,
} from './no_data/dashboard_app_no_data';
import { loadAndRemoveDashboardState } from './url/sync_dashboard_url_state';
import {
  getSessionURLObservable,
  getSearchSessionIdFromURL,
  removeSearchSessionIdFromURL,
  createSessionRestorationDataProvider,
} from './url/search_sessions_integration';
import { DashboardApi, DashboardRenderer } from '..';
import { type DashboardEmbedSettings } from './types';
import { pluginServices } from '../services/plugin_services';
import { DashboardRedirect } from '../dashboard_container/types';
import { useDashboardMountContext } from './hooks/dashboard_mount_context';
import {
  createDashboardEditUrl,
  DASHBOARD_APP_ID,
  DASHBOARD_STATE_STORAGE_KEY,
} from '../dashboard_constants';
import { useDashboardOutcomeValidation } from './hooks/use_dashboard_outcome_validation';
import { loadDashboardHistoryLocationState } from './locator/load_dashboard_history_location_state';
import type { DashboardCreationOptions } from '../dashboard_container/embeddable/dashboard_container_factory';
import { DashboardTopNav } from '../dashboard_top_nav';
import { DashboardTabTitleSetter } from './tab_title_setter/dashboard_tab_title_setter';
import { useObservabilityAIAssistantContext } from './hooks/use_observability_ai_assistant_context';
import { SharedDashboardState } from '../../common';

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
  const [regenerateId, setRegenerateId] = useState(uuidv4());

  useMount(() => {
    (async () => setShowNoDataPage(await isDashboardAppInNoDataState()))();
  });
  const [dashboardApi, setDashboardApi] = useState<DashboardApi | undefined>(undefined);

  /**
   * Unpack & set up dashboard services
   */
  const {
    screenshotMode: { isScreenshotMode, getScreenshotContext },
    coreContext: { executionContext },
    embeddable: { getStateTransfer },
    notifications: { toasts },
    settings: { uiSettings },
    data: { search, dataViews },
    customBranding,
    share: { url },
    observabilityAIAssistant,
  } = pluginServices.getServices();
  const showPlainSpinner = useObservable(customBranding.hasCustomBranding$, false);
  const { scopedHistory: getScopedHistory } = useDashboardMountContext();

  useObservabilityAIAssistantContext({
    observabilityAIAssistant: observabilityAIAssistant.start,
    dashboardApi,
    search,
    dataViews,
  });

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
        ...(isScreenshotMode() && getScreenshotContext('layout') === 'print'
          ? { viewMode: ViewMode.PRINT }
          : {}),
      };
    };

    return Promise.resolve<DashboardCreationOptions>({
      getIncomingEmbeddable: () =>
        getStateTransfer().getIncomingEmbeddablePackage(DASHBOARD_APP_ID, true),

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
      getInitialInput,
      validateLoadedSavedObject: validateOutcome,
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
    isScreenshotMode,
    getStateTransfer,
    kbnUrlStateStorage,
    getScreenshotContext,
  ]);

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

  const locator = useMemo(() => url?.locators.get(DASHBOARD_APP_LOCATOR), [url]);

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
        onApiAvailable={setDashboardApi}
        dashboardRedirect={redirectTo}
        savedObjectId={savedDashboardId}
        showPlainSpinner={showPlainSpinner}
        getCreationOptions={getCreationOptions}
      />
    </>
  );
}
