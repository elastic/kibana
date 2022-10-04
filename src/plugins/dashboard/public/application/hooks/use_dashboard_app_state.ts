/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';
import { History } from 'history';
import { debounceTime, switchMap } from 'rxjs/operators';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';

import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';

import {
  diffDashboardState,
  syncDashboardUrlState,
  syncDashboardDataViews,
  buildDashboardContainer,
  syncDashboardFilterState,
  syncDashboardContainerInput,
  tryDestroyDashboardContainer,
  loadDashboardHistoryLocationState,
} from '../lib';
import {
  dashboardStateLoadWasSuccessful,
  LoadDashboardFromSavedObjectReturn,
} from '../../services/dashboard_saved_object/lib/load_dashboard_state_from_saved_object';
import { DashboardConstants } from '../..';
import { DashboardAppLocatorParams } from '../../locator';
import { dashboardSavedObjectErrorStrings, getNewDashboardTitle } from '../../dashboard_strings';
import { pluginServices } from '../../services/plugin_services';
import { useDashboardMountContext } from './dashboard_mount_context';
import { isDashboardAppInNoDataState } from '../dashboard_app_no_data';
import { setDashboardState, useDashboardDispatch, useDashboardSelector } from '../state';
import type { DashboardBuildContext, DashboardAppState, DashboardState } from '../../types';

export interface UseDashboardStateProps {
  history: History;
  showNoDataPage: boolean;
  savedDashboardId?: string;
  isEmbeddedExternally: boolean;
  kbnUrlStateStorage: IKbnUrlStateStorage;
  setShowNoDataPage: (showNoData: boolean) => void;
}

export const useDashboardAppState = ({
  history,
  savedDashboardId,
  showNoDataPage,
  setShowNoDataPage,
  kbnUrlStateStorage,
  isEmbeddedExternally,
}: UseDashboardStateProps) => {
  const dispatchDashboardStateChange = useDashboardDispatch();
  const dashboardState = useDashboardSelector((state) => state.dashboardStateReducer);

  /**
   *  Dashboard app state is the return value for this hook and contains interaction points that the rest of the app can use
   * to read or manipulate dashboard state.
   */
  const [dashboardAppState, setDashboardAppState] = useState<DashboardAppState>(() => ({
    $onDashboardStateChange: new BehaviorSubject({} as DashboardState),
    $triggerDashboardRefresh: new Subject<{ force?: boolean }>(),
  }));

  /**
   *  Last saved state is diffed against the current dashboard state any time either changes. This is used to set the
   * unsaved changes portion of the dashboardAppState.
   */
  const [lastSavedState, setLastSavedState] = useState<DashboardState>();
  const $onLastSavedStateChange = useMemo(() => new Subject<DashboardState>(), []);

  /**
   * Unpack services and context
   */
  const { scopedHistory } = useDashboardMountContext();
  const {
    embeddable,
    notifications: { toasts },
    chrome: { docTitle },
    dashboardCapabilities,
    dashboardSessionStorage,
    spaces: { redirectLegacyUrl },
    data: { query, search, dataViews },
    initializerContext: { kibanaVersion },
    screenshotMode: { isScreenshotMode, getScreenshotContext },
    dashboardSavedObject: { loadDashboardStateFromSavedObject },
  } = pluginServices.getServices();

  const { getStateTransfer } = embeddable;

  /**
   * This useEffect triggers when the dashboard ID changes, and is in charge of loading the saved dashboard,
   * fetching the initial state, building the Dashboard Container embeddable, and setting up all state syncing.
   */
  useEffect(() => {
    // fetch incoming embeddable from state transfer service.
    const incomingEmbeddable = getStateTransfer().getIncomingEmbeddablePackage(
      DashboardConstants.DASHBOARDS_ID,
      true
    );

    let canceled = false;
    let onDestroy: () => void;

    /**
     * The dashboard build context is a collection of all of the services and props required in subsequent steps to build the dashboard
     * from the dashboardId. This build context doesn't contain any extrenuous services.
     */
    const dashboardBuildContext: DashboardBuildContext = {
      history,
      kbnUrlStateStorage,
      isEmbeddedExternally,
      dispatchDashboardStateChange,
      $checkForUnsavedChanges: new Subject(),
      $onDashboardStateChange: dashboardAppState.$onDashboardStateChange,
      $triggerDashboardRefresh: dashboardAppState.$triggerDashboardRefresh,
      getLatestDashboardState: () => dashboardAppState.$onDashboardStateChange.value,
    };

    (async () => {
      /**
       * Ensure default data view exists and there is data in elasticsearch
       */
      const isEmpty = await isDashboardAppInNoDataState();
      if (showNoDataPage || isEmpty) {
        setShowNoDataPage(true);
        return;
      }

      const defaultDataView = await dataViews.getDefaultDataView();

      if (!defaultDataView) {
        return;
      }

      /**
       * Load and unpack state from dashboard saved object.
       */
      let loadSavedDashboardResult: LoadDashboardFromSavedObjectReturn;
      try {
        loadSavedDashboardResult = await loadDashboardStateFromSavedObject({
          getScopedHistory: scopedHistory,
          id: savedDashboardId,
        });
      } catch (error) {
        // redirect back to landing page if dashboard could not be loaded.
        toasts.addDanger(dashboardSavedObjectErrorStrings.getDashboardLoadError(error.message));
        history.push(DashboardConstants.LANDING_PAGE_PATH);
        return;
      }
      if (canceled || !dashboardStateLoadWasSuccessful(loadSavedDashboardResult)) {
        return;
      }

      const { dashboardState: savedDashboardState, createConflictWarning } =
        loadSavedDashboardResult;

      /**
       * Combine initial state from the saved object, session storage, and URL, then dispatch it to Redux.
       */
      const dashboardSessionStorageState = dashboardSessionStorage.getState(savedDashboardId) || {};

      const forwardedAppState = loadDashboardHistoryLocationState(
        scopedHistory()?.location?.state as undefined | DashboardAppLocatorParams
      );

      const { initialDashboardStateFromUrl, stopWatchingAppStateInUrl } = syncDashboardUrlState({
        ...dashboardBuildContext,
      });

      const printLayoutDetected = isScreenshotMode() && getScreenshotContext('layout') === 'print';

      const initialDashboardState: DashboardState = {
        ...savedDashboardState,
        ...dashboardSessionStorageState,
        ...initialDashboardStateFromUrl,
        ...forwardedAppState,

        ...(printLayoutDetected ? { viewMode: ViewMode.PRINT } : {}),

        // if there is an incoming embeddable, dashboard always needs to be in edit mode to receive it.
        ...(incomingEmbeddable ? { viewMode: ViewMode.EDIT } : {}),
      };
      dispatchDashboardStateChange(setDashboardState(initialDashboardState));

      /**
       * Start syncing dashboard state with the Query, Filters and Timepicker from the Query Service.
       */
      const { stopSyncingDashboardFilterState } = syncDashboardFilterState({
        ...dashboardBuildContext,
        initialDashboardState,
      });

      /**
       * Build the dashboard container embeddable, and apply the incoming embeddable if it exists.
       */

      const dashboardContainer = await buildDashboardContainer({
        ...dashboardBuildContext,
        initialDashboardState,
        incomingEmbeddable,
        executionContext: {
          type: 'dashboard',
          description: initialDashboardState.title,
        },
      });

      if (canceled || !dashboardContainer) {
        tryDestroyDashboardContainer(dashboardContainer);
        return;
      }

      /**
       * Start syncing index patterns between the Query Service and the Dashboard Container.
       */
      const dataViewsSubscription = syncDashboardDataViews({
        dashboardContainer,
        onUpdateDataViews: async (newDataViewIds: string[]) => {
          if (newDataViewIds?.[0]) {
            dashboardContainer.controlGroup?.setRelevantDataViewId(newDataViewIds[0]);
          }
          // fetch all data views. These should be cached locally at this time so we will not need to query ES.
          const allDataViews = await Promise.all(newDataViewIds.map((id) => dataViews.get(id)));
          dashboardContainer.setAllDataViews(allDataViews);
          setDashboardAppState((s) => ({ ...s, dataViews: allDataViews }));
        },
      });

      /**
       * Set up the two way syncing between the Dashboard Container and the Redux Store.
       */
      const stopSyncingContainerInput = syncDashboardContainerInput({
        ...dashboardBuildContext,
        dashboardContainer,
      });

      /**
       * Any time the redux state, or the last saved state changes, compare them, set the unsaved
       * changes state, and and push the unsaved changes to session storage.
       */

      const lastSavedSubscription = combineLatest([
        $onLastSavedStateChange,
        dashboardAppState.$onDashboardStateChange,
        dashboardBuildContext.$checkForUnsavedChanges,
      ])
        .pipe(
          debounceTime(DashboardConstants.CHANGE_CHECK_DEBOUNCE),
          switchMap((states) => {
            return new Observable((observer) => {
              const [lastSaved, current] = states;
              diffDashboardState({
                getEmbeddable: (id: string) => dashboardContainer.untilEmbeddableLoaded(id),
                originalState: lastSaved,
                newState: current,
              }).then((unsavedChanges) => {
                if (observer.closed) return;
                /**
                 * changes to the dashboard should only be considered 'unsaved changes' when
                 * editing the dashboard
                 */
                const hasUnsavedChanges =
                  current.viewMode === ViewMode.EDIT && Object.keys(unsavedChanges).length > 0;
                setDashboardAppState((s) => ({ ...s, hasUnsavedChanges }));

                unsavedChanges.viewMode = current.viewMode; // always push view mode into session store.

                /**
                 * Current behaviour expects time range not to be backed up.
                 * TODO: Revisit this. It seems like we should treat all state the same.
                 */
                dashboardSessionStorage.setState(
                  savedDashboardId,
                  omit(unsavedChanges, ['timeRange', 'refreshInterval'])
                );
              });
            });
          })
        )
        .subscribe();

      /**
       * initialize the last saved state, and build a callback which can be used to update
       * the last saved state on save.
       */
      setLastSavedState(savedDashboardState);
      dashboardBuildContext.$checkForUnsavedChanges.next(undefined);
      const updateLastSavedState = () => {
        setLastSavedState(dashboardBuildContext.getLatestDashboardState());
      };

      /**
       * Apply changes to the dashboard app state, and set the document title
       */
      docTitle.change(savedDashboardState.title || getNewDashboardTitle());
      setDashboardAppState((s) => ({
        ...s,
        dashboardContainer,
        updateLastSavedState,
        createConflictWarning,
        getLatestDashboardState: dashboardBuildContext.getLatestDashboardState,
      }));

      onDestroy = () => {
        stopSyncingContainerInput();
        stopWatchingAppStateInUrl();
        stopSyncingDashboardFilterState();
        lastSavedSubscription.unsubscribe();
        dataViewsSubscription.unsubscribe();
        tryDestroyDashboardContainer(dashboardContainer);
        setDashboardAppState((state) => ({
          ...state,
          dashboardContainer: undefined,
        }));
      };
    })();
    return () => {
      canceled = true;
      onDestroy?.();
    };
  }, [
    dashboardAppState.$triggerDashboardRefresh,
    dashboardAppState.$onDashboardStateChange,
    loadDashboardStateFromSavedObject,
    dispatchDashboardStateChange,
    $onLastSavedStateChange,
    dashboardSessionStorage,
    dashboardCapabilities,
    isEmbeddedExternally,
    getScreenshotContext,
    kbnUrlStateStorage,
    setShowNoDataPage,
    redirectLegacyUrl,
    savedDashboardId,
    isScreenshotMode,
    getStateTransfer,
    showNoDataPage,
    scopedHistory,
    kibanaVersion,
    dataViews,
    embeddable,
    docTitle,
    history,
    toasts,
    search,
    query,
  ]);

  /**
   *  rebuild reset to last saved state callback whenever last saved state changes
   */
  const resetToLastSavedState = useCallback(() => {
    if (!lastSavedState || !dashboardAppState.getLatestDashboardState) {
      return;
    }

    if (dashboardAppState.getLatestDashboardState().timeRestore) {
      const { timefilter } = query.timefilter;
      const { timeRange, refreshInterval } = lastSavedState;
      if (timeRange) timefilter.setTime(timeRange);
      if (refreshInterval) timefilter.setRefreshInterval(refreshInterval);
    }
    dispatchDashboardStateChange(
      setDashboardState({
        ...lastSavedState,
        viewMode: ViewMode.VIEW,
      })
    );
  }, [lastSavedState, dashboardAppState, query.timefilter, dispatchDashboardStateChange]);

  /**
   *  publish state to the state change observable when redux state changes
   */
  useEffect(() => {
    if (!dashboardState || Object.keys(dashboardState).length === 0) return;
    dashboardAppState.$onDashboardStateChange.next(dashboardState);
  }, [dashboardAppState.$onDashboardStateChange, dashboardState]);

  /**
   * push last saved state to the state change observable when last saved state changes
   */
  useEffect(() => {
    if (!lastSavedState) return;
    $onLastSavedStateChange.next(lastSavedState);
  }, [$onLastSavedStateChange, lastSavedState]);

  return { ...dashboardAppState, resetToLastSavedState };
};
