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
    map(getCurrentProfileUrlState),
    distinctUntilChanged((a, b) => isEqual(a, b)),
    skip(1)
  );

  const profileStateContainer: INullableBaseStateContainer<ProfileStateMap | undefined> = {
    get: () => getCurrentProfileUrlState(),
    set: (profileUrlState) => {
      const currentProfileStateMap = selectTab(getState(), tabId).profileState;

      // URL state may be expanded with defaults, while Redux stores explicit overrides only.
      // Normalize both sides to explicit URL fields before comparing or writing.
      const currentProfileUrlStateMap = services.profileStateRegistry.pickStateByType({
        profileStateMap: currentProfileStateMap,
        stateTypes: [ProfileStateType.Url],
        defaultsHandling: 'strip',
      });
      const nextProfileUrlStateMap = services.profileStateRegistry.pickStateByType({
        profileStateMap: profileUrlState ?? undefined,
        stateTypes: [ProfileStateType.Url],
        defaultsHandling: 'strip',
      });

      // Apply every registered URL entry from `_p`, not only the current active profile, because
      // URL hydration can run before profile resolution makes one of these entries active
      for (const [stateKey, nextProfileUrlState] of Object.entries(nextProfileUrlStateMap)) {
        const currentProfileUrlState = currentProfileUrlStateMap[stateKey];

        if (isEqual(currentProfileUrlState, nextProfileUrlState)) {
          continue;
        }

        // URL hydration should replace URL-backed fields only; keep tab-local UI and persistent
        // overrides that do not belong to `_p`
        const nonUrlProfileState = services.profileStateRegistry.filterFieldsByType({
          profileState: currentProfileStateMap[stateKey],
          stateKey,
          stateTypes: [ProfileStateType.Ui, ProfileStateType.Persistent],
          defaultsHandling: 'strip',
        });

        dispatch(
          internalStateSlice.actions.setProfileState({
            tabId,
            key: stateKey,
            profileState: { ...nonUrlProfileState, ...nextProfileUrlState },
          })
        );
      }

      const hasNextProfileUrlState = Object.keys(nextProfileUrlStateMap).length > 0;
      const profileUrlStateDefinition = selectCurrentProfileUrlStateDefinition(
        runtimeStateManager,
        tabId
      );

      // If `_p` omits the active profile key, treat that as clearing active URL overrides. Non-URL
      // overrides stay in Redux so adapters still merge them with defaults. When `_p` contains
      // another profile key, keep the active profile intact until profile re-resolution catches up.
      if (!hasNextProfileUrlState && profileUrlStateDefinition) {
        const currentProfileState = currentProfileStateMap[profileUrlStateDefinition.key];
        const nonUrlProfileState = services.profileStateRegistry.filterFieldsByType({
          profileState: currentProfileState,
          stateKey: profileUrlStateDefinition.key,
          stateTypes: [ProfileStateType.Ui, ProfileStateType.Persistent],
          defaultsHandling: 'strip',
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
