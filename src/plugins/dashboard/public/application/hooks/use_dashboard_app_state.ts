/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { History } from 'history';
import { debounceTime } from 'rxjs/operators';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BehaviorSubject, combineLatest, Subject } from 'rxjs';

import { DashboardConstants } from '../..';
import { ViewMode } from '../../services/embeddable';
import { useKibana } from '../../services/kibana_react';
import { getNewDashboardTitle } from '../../dashboard_strings';
import { IKbnUrlStateStorage } from '../../services/kibana_utils';
import { setDashboardState, useDashboardDispatch, useDashboardSelector } from '../state';
import {
  DashboardBuildContext,
  DashboardAppServices,
  DashboardAppState,
  DashboardRedirect,
  DashboardState,
} from '../../types';
import {
  tryDestroyDashboardContainer,
  syncDashboardContainerInput,
  savedObjectToDashboardState,
  syncDashboardIndexPatterns,
  syncDashboardFilterState,
  loadSavedDashboardState,
  buildDashboardContainer,
  loadDashboardUrlState,
  diffDashboardState,
  areTimeRangesEqual,
} from '../lib';

export interface UseDashboardStateProps {
  history: History;
  savedDashboardId?: string;
  redirectTo: DashboardRedirect;
  isEmbeddedExternally: boolean;
  kbnUrlStateStorage: IKbnUrlStateStorage;
}

export const useDashboardAppState = ({
  history,
  redirectTo,
  savedDashboardId,
  kbnUrlStateStorage,
  isEmbeddedExternally,
}: UseDashboardStateProps) => {
  const services = useKibana<DashboardAppServices>().services;
  const dispatchDashboardStateChange = useDashboardDispatch();
  const dashboardState = useDashboardSelector((state) => state.dashboardStateReducer);
  const [lastSavedState, setLastSavedState] = useState<DashboardState>();

  const [dashboardAppState, setDashboardAppState] = useState<DashboardAppState>({
    $onDashboardStateChange: new BehaviorSubject({} as DashboardState),
    $triggerDashboardRefresh: new Subject<{ force?: boolean }>(),
  });

  const $onLastSavedStateChange = useMemo(() => new Subject<DashboardState>(), []);

  /**
   * This useEffect triggers when the dashboard ID changes, and is in charge of loading the saved dashboard,
   * fetching the initial state, building the Dashboard Container embeddable, and setting up all state syncing.
   */
  useEffect(() => {
    /**
     * Unpack services inside UseEffect to keep deps array small. Services do not change during runtime.
     */
    const {
      data,
      chrome,
      embeddable,
      initializerContext,
      dashboardCapabilities,
      dashboardSessionStorage,
    } = services;

    const { docTitle } = chrome;
    const { getStateTransfer } = embeddable;
    const timefilter = data.query.timefilter.timefilter;
    const { version: kibanaVersion } = initializerContext.env.packageInfo;

    /**
     * Create dashboard build context package which will be used in all of the following steps.
     */
    const dashboardBuildContext: DashboardBuildContext = {
      history,
      services,
      kibanaVersion,
      savedDashboardId,
      kbnUrlStateStorage,
      isEmbeddedExternally,
      dispatchDashboardStateChange,
      $checkForUnsavedChanges: new Subject(),
      $onDashboardStateChange: dashboardAppState.$onDashboardStateChange,
      $triggerDashboardRefresh: dashboardAppState.$triggerDashboardRefresh,
      getLatestDashboardState: () => dashboardAppState.$onDashboardStateChange.value,
    };

    // fetch incoming embeddable from state transfer service.
    const incomingEmbeddable = getStateTransfer().getIncomingEmbeddablePackage(
      DashboardConstants.DASHBOARDS_ID,
      true
    );

    let canceled = false;
    let onDestroy: () => void;

    (async () => {
      /**
       * Load and unpack state from dashboard saved object.
       */
      const loadSavedDashboardResult = await loadSavedDashboardState(dashboardBuildContext);
      if (canceled || !loadSavedDashboardResult) return;
      const { savedDashboard, savedDashboardState } = loadSavedDashboardResult;

      /**
       * Combine initial state from the session storage,  sources, then dispatch it to Redux.
       */
      const dashboardSessionStorageState = dashboardSessionStorage.getState(savedDashboardId) || {};
      const dashboardURLState = loadDashboardUrlState(dashboardBuildContext);
      const initialDashboardState = {
        ...savedDashboardState,
        ...dashboardSessionStorageState,
        ...dashboardURLState,

        // if there is an incoming embeddable, dashboard always needs to be in edit mode to receive it.
        ...(incomingEmbeddable ? { viewMode: ViewMode.EDIT } : {}),
      };
      dispatchDashboardStateChange(setDashboardState(initialDashboardState));

      /**
       * Start syncing dashboard state with the Query, Filters and Timepicker from the Query Service.
       */
      const { applyFilters, stopSyncingDashboardFilterState } = syncDashboardFilterState({
        ...dashboardBuildContext,
        initialDashboardState,
        savedDashboard,
      });

      /**
       * Build the dashboard container embeddable, and apply the incoming embeddable if it exists.
       */
      const dashboardContainer = await buildDashboardContainer({
        ...dashboardBuildContext,
        initialDashboardState,
        incomingEmbeddable,
        savedDashboard,
      });
      if (canceled || !dashboardContainer) {
        tryDestroyDashboardContainer(dashboardContainer);
        return;
      }

      /**
       * Start syncing index patterns between the Query Service and the Dashboard Container.
       */
      const indexPatternsSubscription = syncDashboardIndexPatterns({
        dashboardContainer,
        indexPatterns: services.indexPatterns,
        onUpdateIndexPatterns: (indexPatterns) =>
          setDashboardAppState((s) => ({ ...s, indexPatterns })),
      });

      /**
       * Set up the two way syncing between the Dashboard Container and the Redux Store.
       */
      const stopSyncingContainerInput = syncDashboardContainerInput({
        ...dashboardBuildContext,
        dashboardContainer,
        savedDashboard,
        applyFilters,
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
        .pipe(debounceTime(DashboardConstants.CHANGE_CHECK_DEBOUNCE))
        .subscribe((states) => {
          const [lastSaved, current] = states;
          const unsavedChanges =
            current.viewMode === ViewMode.EDIT ? diffDashboardState(lastSaved, current) : {};

          if (current.viewMode === ViewMode.EDIT) {
            const lastSavedTimeRange = {
              from: savedDashboard?.timeFrom,
              to: savedDashboard?.timeTo,
            };
            const savedTimeChanged =
              lastSaved.timeRestore &&
              !areTimeRangesEqual(lastSavedTimeRange, timefilter.getTime());
            const hasUnsavedChanges = Object.keys(unsavedChanges).length > 0 || savedTimeChanged;
            setDashboardAppState((s) => ({ ...s, hasUnsavedChanges }));
          }

          unsavedChanges.viewMode = current.viewMode; // always push view mode into session store.
          dashboardSessionStorage.setState(savedDashboardId, unsavedChanges);
        });

      /**
       * initialize the last saved state, and build a callback which can be used to update
       * the last saved state on save.
       */
      setLastSavedState(savedDashboardState);
      dashboardBuildContext.$checkForUnsavedChanges.next();
      const updateLastSavedState = () => {
        setLastSavedState(
          savedObjectToDashboardState({
            hideWriteControls: dashboardCapabilities.hideWriteControls,
            savedObjectsTagging: services.savedObjectsTagging,
            version: dashboardBuildContext.kibanaVersion,
            usageCollection: services.usageCollection,
            savedDashboard,
          })
        );
      };

      /**
       * Apply changes to the dashboard app state, and set the document title
       */
      docTitle.change(savedDashboardState.title || getNewDashboardTitle());
      setDashboardAppState((s) => ({
        ...s,
        applyFilters,
        savedDashboard,
        dashboardContainer,
        updateLastSavedState,
        getLatestDashboardState: dashboardBuildContext.getLatestDashboardState,
      }));

      onDestroy = () => {
        stopSyncingContainerInput();
        stopSyncingDashboardFilterState();
        lastSavedSubscription.unsubscribe();
        indexPatternsSubscription.unsubscribe();
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
    dispatchDashboardStateChange,
    $onLastSavedStateChange,
    isEmbeddedExternally,
    kbnUrlStateStorage,
    savedDashboardId,
    redirectTo,
    history,
    services,
  ]);

  // rebuild reset to last saved state callback whenever last saved state changes
  const resetToLastSavedState = useCallback(() => {
    if (
      !lastSavedState ||
      !dashboardAppState.savedDashboard ||
      !dashboardAppState.getLatestDashboardState
    ) {
      return;
    }

    if (dashboardAppState.getLatestDashboardState().timeRestore) {
      const timefilter = services.data.query.timefilter.timefilter;
      const { timeFrom: from, timeTo: to, refreshInterval } = dashboardAppState.savedDashboard;
      if (from && to) timefilter.setTime({ from, to });
      if (refreshInterval) timefilter.setRefreshInterval(refreshInterval);
    }
    dispatchDashboardStateChange(setDashboardState(lastSavedState));
  }, [
    lastSavedState,
    dashboardAppState,
    dispatchDashboardStateChange,
    services.data.query.timefilter.timefilter,
  ]);

  // publish state to the state change observable when redux state changes;
  useEffect(() => {
    if (!dashboardState || Object.keys(dashboardState).length === 0) return;
    dashboardAppState.$onDashboardStateChange.next(dashboardState);
  }, [dashboardAppState.$onDashboardStateChange, dashboardState]);

  // push last saved state to the state change observable when last saved state changes
  useEffect(() => {
    if (!lastSavedState) return;
    $onLastSavedStateChange.next(lastSavedState);
  }, [$onLastSavedStateChange, lastSavedState]);

  return { ...dashboardAppState, resetToLastSavedState };
};
