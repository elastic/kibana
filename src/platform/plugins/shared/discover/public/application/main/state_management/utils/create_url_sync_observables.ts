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
import type { DiscoverProfileUrlState } from '../../../../../common';
import type { ProfileStateRegistry } from '../../../../context_awareness';
import {
  internalStateActions,
  selectTab,
  selectTabAppState,
  selectTabRuntimeState,
  type DiscoverAppState,
  type DiscoverInternalState,
  type InternalStateDependencies,
  type RuntimeStateManager,
} from '../redux';
import { createTabAppStateObservable } from './create_tab_app_state_observable';
import {
  getCurrentTabProfileUrlState,
  getProfileStateWithoutUrlFields,
  getRestoredProfileUrlState,
} from './get_profile_url_state';

/**
 * Create observables and state containers for 2-directional syncing of appState and globalState with the URL
 */
export const createUrlSyncObservables = ({
  tabId,
  dispatch,
  getState,
  internalState$,
  runtimeStateManager,
  profileStateRegistry,
}: {
  tabId: string;
  dispatch: ThunkDispatch<DiscoverInternalState, InternalStateDependencies, AnyAction>;
  getState: () => DiscoverInternalState;
  internalState$: Observable<DiscoverInternalState>;
  runtimeStateManager: RuntimeStateManager;
  profileStateRegistry: ProfileStateRegistry;
}) => {
  const getAppState = (): DiscoverAppState => {
    return selectTabAppState(getState(), tabId);
  };

  const appState$ = createTabAppStateObservable({
    tabId,
    internalState$,
    getState,
  });

  const createAppStateContainer = (
    isSystemTriggered: boolean
  ): INullableBaseStateContainer<DiscoverAppState> => ({
    get: () => getAppState(),
    set: (appState) => {
      if (!appState) {
        return;
      }

      dispatch(internalStateActions.setAppState({ tabId, appState, isSystemTriggered }));
    },
    state$: appState$,
  });

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

  const getProfileUrlState = (): DiscoverProfileUrlState | null => {
    return (
      getCurrentTabProfileUrlState({
        getState,
        runtimeStateManager,
        profileStateRegistry,
        tabId,
      }) ?? null
    );
  };

  const profileUrlState$ = internalState$.pipe(
    map(getProfileUrlState),
    distinctUntilChanged((a, b) => isEqual(a, b)),
    skip(1)
  );

  const setProfileUrlStateFromUrl = (profileUrlState: DiscoverProfileUrlState | null) => {
    const currentTab = selectTab(getState(), tabId);
    const definition = selectTabRuntimeState(runtimeStateManager, tabId)
      ?.scopedProfilesManager$.getValue()
      .getContexts().dataSourceContext.profileState;

    if (!currentTab || !definition) {
      return;
    }

    const restoredProfileState = profileUrlState
      ? getRestoredProfileUrlState({
          definition,
          profileStateRegistry,
          profileUrlState,
        })
      : undefined;

    const nextProfileState = {
      ...getProfileStateWithoutUrlFields({
        definition,
        profileState: currentTab.profileState[definition.key],
      }),
      ...restoredProfileState,
    };

    if (isEqual(currentTab.profileState[definition.key], nextProfileState)) {
      return;
    }

    dispatch(
      internalStateActions.setProfileState({
        tabId,
        key: definition.key,
        profileState: nextProfileState,
      })
    );
  };

  return {
    appState$,
    createAppStateContainer,
    globalStateContainer,
    profileUrlState$,
    setProfileUrlStateFromUrl,
  };
};
