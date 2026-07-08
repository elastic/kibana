/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Observable, distinctUntilChanged, filter, map, skip } from 'rxjs';
import { isEqual } from 'lodash';
import { type GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import { type INullableBaseStateContainer } from '@kbn/kibana-utils-plugin/public';
import type { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import {
  internalStateActions,
  selectTab,
  selectTabAppState,
  type DiscoverAppState,
  type DiscoverInternalState,
  type InternalStateDependencies,
} from '../redux';
import { internalStateSlice } from '../redux/internal_state';
import { selectUrlProfileStateDefinition } from '../redux/runtime_state';
import { createTabAppStateObservable } from './create_tab_app_state_observable';
import { ProfileStateType } from '../../../../context_awareness';

const EMPTY_PROFILE_URL_STATE = {};

/**
 * Create observables and state containers for 2-directional syncing of appState and globalState with the URL
 */
export const createUrlSyncObservables = ({
  tabId,
  dispatch,
  getState,
  internalState$,
  runtimeStateManager,
  services,
}: {
  tabId: string;
  dispatch: ThunkDispatch<DiscoverInternalState, InternalStateDependencies, AnyAction>;
  getState: () => DiscoverInternalState;
  internalState$: Observable<DiscoverInternalState>;
  runtimeStateManager: InternalStateDependencies['runtimeStateManager'];
  services: InternalStateDependencies['services'];
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

  const getCurrentProfileUrlState = () => {
    const profileStateDefinition = selectUrlProfileStateDefinition(runtimeStateManager, tabId);
    const profileState = profileStateDefinition
      ? selectTab(getState(), tabId).profileState[profileStateDefinition.key]
      : undefined;
    const pickedUrlState = profileStateDefinition
      ? services.profileStateRegistry.pickStateByType({
          profileState: { [profileStateDefinition.key]: profileState },
          stateType: [ProfileStateType.Url],
        })
      : undefined;

    return pickedUrlState && Object.keys(pickedUrlState).length ? pickedUrlState : undefined;
  };

  const profileState$ = internalState$.pipe(
    map(() => getCurrentProfileUrlState()),
    filter((profileUrlState) => profileUrlState !== undefined),
    distinctUntilChanged((a, b) => isEqual(a, b)),
    skip(1)
  );

  const profileStateContainer: INullableBaseStateContainer<Record<string, object | undefined>> = {
    get: () => getCurrentProfileUrlState() ?? EMPTY_PROFILE_URL_STATE,
    set: (profileUrlState) => {
      const profileStateDefinition = selectUrlProfileStateDefinition(runtimeStateManager, tabId);

      if (!profileStateDefinition) {
        return;
      }

      const currentProfileState = selectTab(getState(), tabId).profileState[
        profileStateDefinition.key
      ];
      const nonUrlState = services.profileStateRegistry.pickStateByType({
        profileState: { [profileStateDefinition.key]: currentProfileState },
        stateType: [ProfileStateType.Ui, ProfileStateType.Persistent],
      })[profileStateDefinition.key];
      const urlState = services.profileStateRegistry.pickStateByType({
        profileState: profileUrlState ?? EMPTY_PROFILE_URL_STATE,
        stateType: [ProfileStateType.Url],
      })[profileStateDefinition.key];
      const nextProfileState = {
        ...profileStateDefinition.defaultState,
        ...nonUrlState,
        ...urlState,
      };

      if (isEqual(currentProfileState, nextProfileState)) {
        return;
      }

      dispatch(
        internalStateSlice.actions.setProfileState({
          tabId,
          key: profileStateDefinition.key,
          profileState: nextProfileState,
        })
      );
    },
    state$: profileState$,
  };

  return {
    appState$,
    createAppStateContainer,
    globalStateContainer,
    profileStateContainer,
  };
};
