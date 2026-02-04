/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { ViewMode } from '@kbn/presentation-publishing';
import type { History } from 'history';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { debounceTime } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import type { SerializableRecord } from '@kbn/utility-types';
import type { DashboardState } from '../../common/types';
import type { DashboardApi, DashboardCreationOptions } from '..';
import { DASHBOARD_APP_ID } from '../../common/page_bundle_constants';
import { DashboardRenderer } from '../dashboard_renderer/dashboard_renderer';
import { DashboardTopNav } from '../dashboard_top_nav';
import {
  coreServices,
  dataService,
  embeddableService,
  screenshotModeService,
  shareService,
} from '../services/kibana_services';
import { DASHBOARD_STATE_STORAGE_KEY, createDashboardEditUrl } from '../utils/urls';
import { useDashboardMountContext } from './hooks/dashboard_mount_context';
import { useDashboardOutcomeValidation } from './hooks/use_dashboard_outcome_validation';
import { useObservabilityAIAssistantContext } from './hooks/use_observability_ai_assistant_context';
import {
  DashboardAppNoDataPage,
  isDashboardAppInNoDataState,
} from './no_data/dashboard_app_no_data';
import { DashboardTabTitleSetter } from './tab_title_setter/dashboard_tab_title_setter';
import type { DashboardRedirect } from './types';
import { type DashboardEmbedSettings } from './types';
import {
  createSessionRestorationDataProvider,
  getSearchSessionIdFromURL,
  getSessionURLObservable,
  removeSearchSessionIdFromURL,
} from './url/search_sessions_integration';
import {
  extractDashboardState,
  loadAndRemoveDashboardState,
  startSyncingExpandedPanelState,
} from './url';
import type { DashboardInternalApi } from '../dashboard_api/types';

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
  const incomingEmbeddables = useMemo(() => {
    return embeddableService
      .getStateTransfer()
      .getIncomingEmbeddablePackage(DASHBOARD_APP_ID, true);
  }, []);

  useEffect(() => {
    let canceled = false;
    // show dashboard when there is an incoming embeddable
    if (incomingEmbeddables) {
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
  }, [incomingEmbeddables]);
  const [dashboardApi, setDashboardApi] = useState<DashboardApi | undefined>(undefined);
  const [dashboardInternalApi, setDashboardInternalApi] = useState<
    DashboardInternalApi | undefined
  >(undefined);
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
      let stateFromLocator: Partial<DashboardState> = {};
      try {
        stateFromLocator = extractDashboardState(getScopedHistory().location.state);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Unable to extract dashboard state from locator. Error: ', e);
      }

      let initialUrlState: Partial<DashboardState> = {};
      try {
        initialUrlState = loadAndRemoveDashboardState(kbnUrlStateStorage);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Unable to extract dashboard state from URL. Error: ', e);
      }

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
      getIncomingEmbeddables: () => incomingEmbeddables,

      // integrations
      useSessionStorageIntegration: true,
      useUnifiedSearchIntegration: true,
      // Hide the control group from the dashboard renderer; the dashboard app handles displaying
      // pinned controls in the top nav instead
      useControlsIntegration: false,
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
      getPassThroughContext: () =>
        (getScopedHistory().location.state as { passThroughContext?: SerializableRecord })
          ?.passThroughContext,
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
    incomingEmbeddables,
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
        const rawAppStateInUrl = kbnUrlStateStorage.get<unknown>(DASHBOARD_STATE_STORAGE_KEY);
        if (rawAppStateInUrl) setRegenerateId(uuidv4());
      });
    return () => appStateSubscription.unsubscribe();
  }, [dashboardApi, kbnUrlStateStorage, savedDashboardId]);

  const locator = useMemo(() => shareService?.url.locators.get(DASHBOARD_APP_LOCATOR), []);

  return showNoDataPage ? (
    <DashboardAppNoDataPage onDataViewCreated={() => setShowNoDataPage(false)} />
  ) : (
    <>
      {dashboardApi && dashboardInternalApi && (
        <>
          <DashboardTabTitleSetter dashboardApi={dashboardApi} />
          <DashboardTopNav
            key={dashboardApi.uuid}
            redirectTo={redirectTo}
            embedSettings={embedSettings}
            dashboardApi={dashboardApi}
            dashboardInternalApi={dashboardInternalApi}
          />
        </>
      )}

      {getLegacyConflictWarning?.()}
      <DashboardRenderer
        key={regenerateId}
        locator={locator}
        onApiAvailable={(dashboard, dashboardInternal) => {
          if (dashboard && dashboard.uuid !== dashboardApi?.uuid) {
            setDashboardApi(dashboard);
            setDashboardInternalApi(dashboardInternal);
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
