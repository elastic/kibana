/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Observable, distinctUntilChanged, map, skip } from 'rxjs';
import { isEqual } from 'lodash';
import { type GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import { type INullableBaseStateContainer } from '@kbn/kibana-utils-plugin/public';
import type { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import type { InternalStateDependencies } from '../redux/internal_state';
import { selectTab, selectTabAppState } from '../redux/selectors';
import { internalStateActions } from '../redux';
import type { DiscoverAppState, DiscoverInternalState } from '../redux/types';
import { createTabAppStateObservable } from './create_tab_app_state_observable';

/**
 * Create observables and state containers for 2-directional syncing of appState and globalState with the URL
 */
export const createUrlSyncObservables = ({
  tabId,
  dispatch,
  getState,
  internalState$,
}: {
  tabId: string;
  dispatch: ThunkDispatch<DiscoverInternalState, InternalStateDependencies, AnyAction>;
  getState: () => DiscoverInternalState;
  internalState$: Observable<DiscoverInternalState>;
}) => {
  const getAppState = (): DiscoverAppState => {
    return selectTabAppState(getState(), tabId);
  };

  const appState$ = createTabAppStateObservable({
    tabId,
    internalState$,
    getState,
  });

  const appStateContainer: INullableBaseStateContainer<DiscoverAppState> = {
    get: () => getAppState(),
    set: (appState) => {
      if (!appState) {
        return;
      }

      dispatch(internalStateActions.setAppState({ tabId, appState }));
    },
    state$: appState$,
  };

  const getGlobalState = (): GlobalQueryStateFromUrl => {
    const tabState = selectTab(getState(), tabId);
    const { timeRange: time, refreshInterval, filters } = tabState.globalState;

    return { time, refreshInterval, filters };
  };

  const globalState$ = internalState$.pipe(
    map(getGlobalState),
    distinctUntilChanged((a, b) => isEqual(a, b)),
    skip(1)
  );

  const globalStateContainer: INullableBaseStateContainer<GlobalQueryStateFromUrl> = {
    get: () => getGlobalState(),
    set: (state) => {
      if (!state) {
        return;
      }

      const { time: timeRange, refreshInterval, filters } = state;

      dispatch(
        internalStateActions.setGlobalState({
          tabId,
          globalState: {
            timeRange,
            refreshInterval,
            filters,
          },
        })
      );
    },
    state$: globalState$,
  };

  return {
    appState$,
    appStateContainer,
    globalState$,
    globalStateContainer,
  };
};
