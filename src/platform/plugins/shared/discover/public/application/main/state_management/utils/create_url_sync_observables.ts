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
  selectCurrentProfileUrlStateDefinition,
  selectCurrentProfileUrlState,
  selectTab,
  selectTabAppState,
  type DiscoverAppState,
  type DiscoverInternalState,
  type InternalStateDependencies,
} from '../redux';
import { internalStateSlice } from '../redux/internal_state';
import { createTabAppStateObservable } from './create_tab_app_state_observable';
import type { ProfileStateMap } from '../../../../context_awareness';
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

  const getCurrentProfileUrlState = () =>
    selectCurrentProfileUrlState({
      runtimeStateManager,
      tabId,
      profileStateMap: selectTab(getState(), tabId).profileState,
      profileStateRegistry: services.profileStateRegistry,
    });

  const profileState$ = internalState$.pipe(
    skip(1),
    map(() => getCurrentProfileUrlState()),
    filter((profileUrlState) => profileUrlState !== undefined),
    distinctUntilChanged((a, b) => isEqual(a, b))
  );

  const profileStateContainer: INullableBaseStateContainer<ProfileStateMap> = {
    get: () => getCurrentProfileUrlState() ?? EMPTY_PROFILE_URL_STATE,
    set: (profileUrlState) => {
      const currentProfileStateMap = selectTab(getState(), tabId).profileState;
      const currentProfileUrlStateMap = services.profileStateRegistry.pickStateByType({
        profileStateMap: currentProfileStateMap,
        stateTypes: [ProfileStateType.Url],
      });
      const nextProfileUrlStateMap = services.profileStateRegistry.pickStateByType({
        profileStateMap: profileUrlState ?? undefined,
        stateTypes: [ProfileStateType.Url],
      });

      for (const [stateKey, nextProfileUrlState] of Object.entries(nextProfileUrlStateMap)) {
        const currentProfileUrlState = currentProfileUrlStateMap[stateKey];

        if (isEqual(currentProfileUrlState, nextProfileUrlState)) {
          continue;
        }

        const nonUrlProfileState = services.profileStateRegistry.filterFieldsByType({
          profileState: currentProfileStateMap[stateKey],
          stateKey,
          stateTypes: [ProfileStateType.Ui, ProfileStateType.Persistent],
          shouldMergeDefaults: true,
        });

        dispatch(
          internalStateSlice.actions.setProfileState({
            tabId,
            key: stateKey,
            profileState: {
              ...nonUrlProfileState,
              ...nextProfileUrlState,
            },
          })
        );
      }

      const profileUrlStateDefinition = selectCurrentProfileUrlStateDefinition(
        runtimeStateManager,
        tabId
      );

      if (profileUrlStateDefinition && !nextProfileUrlStateMap[profileUrlStateDefinition.key]) {
        const currentProfileState = currentProfileStateMap[profileUrlStateDefinition.key];
        const nonUrlProfileState = services.profileStateRegistry.filterFieldsByType({
          profileState: currentProfileState,
          stateKey: profileUrlStateDefinition.key,
          stateTypes: [ProfileStateType.Ui, ProfileStateType.Persistent],
          shouldMergeDefaults: true,
        });

        if (!isEqual(currentProfileState, nonUrlProfileState)) {
          dispatch(
            internalStateSlice.actions.setProfileState({
              tabId,
              key: profileUrlStateDefinition.key,
              profileState: nonUrlProfileState,
            })
          );
        }
      }
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
