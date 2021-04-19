/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useWhatChanged } from '@simbathesailor/use-what-changed';

import _ from 'lodash';
import { History } from 'history';
import { debounceTime } from 'rxjs/operators';
import { useEffect, useMemo, useState } from 'react';
import { BehaviorSubject, combineLatest, Subject } from 'rxjs';

import { DashboardConstants } from '../..';
import { ViewMode } from '../../services/embeddable';
import { useKibana } from '../../services/kibana_react';
import { getNewDashboardTitle } from '../../dashboard_strings';
import { setDashboardState, useDashboardDispatch, useDashboardSelector } from '../state';
import { createKbnUrlStateStorage, withNotifyOnErrors } from '../../services/kibana_utils';
import {
  DashboardAppServices,
  DashboardAppState,
  DashboardBuildContext,
  DashboardEmbedSettings,
  DashboardRedirect,
  DashboardState,
} from '../../types';
import {
  syncDashboardFilterState,
  loadSavedDashboardState,
  buildDashboardContainer,
  syncDashboardIndexPatterns,
  syncDashboardContainerInput,
  tryDestroyDashboardContainer,
  savedObjectToDashboardState,
  diffDashboardState,
  areTimeRangesEqual,
} from '../lib';

interface UseDashboardStateProps {
  history: History;
  savedDashboardId?: string;
  redirectTo: DashboardRedirect;
  embedSettings?: DashboardEmbedSettings;
}

export const useDashboardAppState = ({
  history,
  savedDashboardId,
  redirectTo,
  embedSettings,
}: UseDashboardStateProps) => {
  const dispatchDashboardStateChange = useDashboardDispatch();
  const services = useKibana<DashboardAppServices>().services;
  const dashboardState = useDashboardSelector((state) => state.dashboardStateReducer);

  const [lastSavedState, setLastSavedState] = useState<DashboardState>();
  const [dashboardAppState, setDashboardAppState] = useState<DashboardAppState>({
    $onDashboardStateChange: new BehaviorSubject({} as DashboardState),
    $triggerDashboardRefresh: new Subject<{ force?: boolean }>(),
  });

  const $onLastSavedStateChange = useMemo(() => new Subject<DashboardState>(), []);

  // load saved dashboard, create container, and set up state sync every time dashboard ID changes.
  useEffect(() => {
    // unpack services inside UseEffect to keep deps array small. Services should not change during runtime.
    const {
      core,
      data,
      chrome,
      uiSettings,
      embeddable,
      initializerContext,
      // dashboardSessionStorage,
      dashboardCapabilities,
    } = services;

    const { docTitle } = chrome;
    const { notifications } = core;
    const { getStateTransfer } = embeddable;
    const timefilter = data.query.timefilter.timefilter;
    const { version: kibanaVersion } = initializerContext.env.packageInfo;

    const dashboardBuildContext: DashboardBuildContext = {
      history,
      services,
      kibanaVersion,
      savedDashboardId,
      dispatchDashboardStateChange,
      $checkForUnsavedChanges: new Subject(),
      isEmbeddedExternally: Boolean(embedSettings),
      $onDashboardStateChange: dashboardAppState.$onDashboardStateChange,
      $triggerDashboardRefresh: dashboardAppState.$triggerDashboardRefresh,
      getLatestDashboardState: () => dashboardAppState.$onDashboardStateChange.value,
      kbnUrlStateStorage: createKbnUrlStateStorage({
        history,
        useHash: uiSettings.get('state:storeInSessionStorage'),
        ...withNotifyOnErrors(notifications.toasts),
      }),
    };

    const incomingEmbeddable = getStateTransfer().getIncomingEmbeddablePackage(
      DashboardConstants.DASHBOARDS_ID,
      true
    );

    let canceled = false;
    let onDestroy: () => void;

    (async () => {
      // Load initial state from dashboard saved object
      const loadSavedDashboardResult = await loadSavedDashboardState(dashboardBuildContext);
      if (canceled || !loadSavedDashboardResult) return;
      const { savedDashboard, savedDashboardState } = loadSavedDashboardResult;

      // Load initial state from URL and from session storage
      // const dashboardSessionStorageState = dashboardSessionStorage.getState(savedDashboardId);
      // TODO: fetch and combine dashboardUrlState

      // Combine and dispatch initial state
      const isViewModeOnLoad =
        dashboardCapabilities.hideWriteControls ||
        (Boolean(savedDashboard.id) && !incomingEmbeddable);
      const initialDashboardState = {
        ...savedDashboardState,
        viewMode: isViewModeOnLoad ? ViewMode.VIEW : ViewMode.EDIT,
        // ...dashboardSessionStorageState,
        // ...dashboardURLState
      };
      dispatchDashboardStateChange(setDashboardState(initialDashboardState));

      // set up syncing for filters
      const { applyFilters, stopSyncingDashboardFilterState } = syncDashboardFilterState({
        ...dashboardBuildContext,
        savedDashboard,
      });

      // Build Dashboard Container embeddable
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

      // Set up syncing for index patterns
      const indexPatternsSubscription = syncDashboardIndexPatterns({
        dashboardContainer,
        indexPatterns: services.indexPatterns,
        onUpdateIndexPatterns: (indexPatterns) =>
          setDashboardAppState((s) => ({ ...s, indexPatterns })),
      });

      // Sync changes between dashboard container and the dashboard redux state
      const stopSyncingContainerInput = syncDashboardContainerInput({
        ...dashboardBuildContext,
        dashboardContainer,
        savedDashboard,
        applyFilters,
      });

      // Compare with last saved state any time state or last saved state changes. Push differences to session storage
      const lastSavedSubscription = combineLatest([
        $onLastSavedStateChange,
        dashboardAppState.$onDashboardStateChange,
        dashboardBuildContext.$checkForUnsavedChanges,
      ])
        .pipe(debounceTime(100))
        .subscribe((states) => {
          const [current, lastSaved] = states;
          const unsavedChanges = diffDashboardState(lastSaved, current);
          if (unsavedChanges.panels) {
            console.log('current panels', current.panels, '\n last panels', lastSaved.panels);
            console.log('deep diff', deepDifference(current.panels, lastSaved.panels));
          }
          const lastSavedTimeRange = {
            from: savedDashboard?.timeFrom,
            to: savedDashboard?.timeTo,
          };
          const savedTimeChanged =
            lastSaved.timeRestore && !areTimeRangesEqual(lastSavedTimeRange, timefilter.getTime());
          const hasUnsavedChanges = Object.keys(unsavedChanges).length > 0 || savedTimeChanged;
          setDashboardAppState((s) => ({ ...s, hasUnsavedChanges }));
        });

      // Set initial lastSavedState and initialize checkForUnsavedChanges
      setLastSavedState(savedDashboardState);
      dashboardBuildContext.$checkForUnsavedChanges.next();

      // Build callback for updating the last saved state.
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

      // Apply changes
      docTitle.change(savedDashboardState.title || getNewDashboardTitle());
      setDashboardAppState((s) => ({
        ...s,
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
    savedDashboardId,
    embedSettings,
    redirectTo,
    history,
    services,
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

  // subscribe to check for unsaved changes every time the last savedState changes.

  // useEffect(() => {
  //   if (!lastSavedState || !isCompleteDashboardAppState(dashboardAppState)) return;

  //   const usingTimeRestore = lastSavedState.timeRestore;
  //   const timefilter = services.data.query.timefilter.timefilter;

  //   console.log('S U B S C R I B I N', dashboardAppState, lastSavedState);
  //   const hasUnsavedChangedSubscription = $checkIsDirty.pipe(debounceTime(100)).subscribe(() => {
  //     if (!dashboardAppState.getLatestDashboardState) return;
  //     const currentState = dashboardAppState.getLatestDashboardState();

  //     if (!currentState) return;
  //     const unsavedChanges = diffDashboardState(lastSavedState, currentState);
  //     // console.log(lastSavedState.query, currentState.query);
  //     const lastSavedTimeRange = {
  //       from: dashboardAppState.savedDashboard?.timeFrom,
  //       to: dashboardAppState.savedDashboard?.timeTo,
  //     };
  //     const savedTimeChanged =
  //       usingTimeRestore && !areTimeRangesEqual(lastSavedTimeRange, timefilter.getTime());
  //     setHasUnsavedChanges(Object.keys(unsavedChanges).length > 0 || savedTimeChanged);
  //   });

  //   return () => hasUnsavedChangedSubscription.unsubscribe();
  // }, [$checkIsDirty, dashboardAppState, lastSavedState, services.data.query.timefilter.timefilter]);

  return dashboardAppState;
};

function deepDifference(object: any, base: any) {
  function changes(obj: any, b: any) {
    return _.transform(obj, function (result: any, value, key) {
      if (!_.isEqual(value, b[key])) {
        result[key] =
          _.isObject(value) && _.isObject(base[key]) ? changes(value, base[key]) : value;
      }
    });
  }
  return changes(object, base);
}
