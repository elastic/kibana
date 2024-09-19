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
import useMount from 'react-use/lib/useMount';
import useObservable from 'react-use/lib/useObservable';
import { debounceTime } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { createKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';

import { DashboardApi, DashboardRenderer } from '..';
import { SharedDashboardState } from '../../common';
import {
  DASHBOARD_APP_ID,
  DASHBOARD_STATE_STORAGE_KEY,
  createDashboardEditUrl,
} from '../dashboard_constants';
import type { DashboardCreationOptions } from '../dashboard_container/embeddable/dashboard_container_factory';
import { DashboardRedirect } from '../dashboard_container/types';
import { DashboardTopNav } from '../dashboard_top_nav';
import {
  coreServices,
  dataService,
  embeddableService,
  shareService,
} from '../services/kibana_services';
import { pluginServices } from '../services/plugin_services';
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
import { loadAndRemoveDashboardState } from './url/url_utils';

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
    observabilityAIAssistant,
  } = pluginServices.getServices();
  const showPlainSpinner = useObservable(coreServices.customBranding.hasCustomBranding$, false);
  const { scopedHistory: getScopedHistory } = useDashboardMountContext();

  useObservabilityAIAssistantContext({
    observabilityAIAssistant: observabilityAIAssistant.start,
    dashboardApi,
    search: dataService.search,
    dataViews: dataService.dataViews,
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
        ...(isScreenshotMode() && getScreenshotContext('layout') === 'print'
          ? { viewMode: ViewMode.PRINT }
          : {}),
      };
    };

    return Promise.resolve<DashboardCreationOptions>({
      getIncomingEmbeddable: () =>
        embeddableService.getStateTransfer().getIncomingEmbeddablePackage(DASHBOARD_APP_ID, true),

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
        onApiAvailable={setDashboardApi}
        dashboardRedirect={redirectTo}
        savedObjectId={savedDashboardId}
        showPlainSpinner={showPlainSpinner}
        getCreationOptions={getCreationOptions}
      />
    </>
  );
}
