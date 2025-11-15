/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GLOBAL_STATE_URL_KEY } from '../../../../../../common/constants';
import { APP_STATE_URL_KEY } from '../../../../../../common';
import { isEqualState } from '../../discover_app_state_container';
import {
  internalStateSlice,
  type InternalStateThunkActionCreator,
  type TabActionPayload,
} from '../internal_state';
import { selectTab } from '../selectors';
import type { DiscoverInternalState, TabState } from '../types';

type AppStatePayload = TabActionPayload<Pick<TabState, 'appState'>>;

const mergeAppState = (
  currentState: DiscoverInternalState,
  { tabId, appState }: AppStatePayload
) => {
  const currentAppState = selectTab(currentState, tabId).appState;
  const mergedAppState = { ...currentAppState, ...appState };
  return { mergedAppState, hasStateChanges: !isEqualState(currentAppState, mergedAppState) };
};

export const updateAppState: InternalStateThunkActionCreator<[AppStatePayload]> =
  (payload) => async (dispatch, getState) => {
    const { mergedAppState, hasStateChanges } = mergeAppState(getState(), payload);

    if (hasStateChanges) {
      dispatch(
        internalStateSlice.actions.setAppState({ tabId: payload.tabId, appState: mergedAppState })
      );
    }
  };

export const replaceAppState: InternalStateThunkActionCreator<[AppStatePayload], Promise<void>> =
  (payload) =>
  async (dispatch, getState, { urlStateStorage }) => {
    const currentState = getState();

    if (currentState.tabs.unsafeCurrentId !== payload.tabId) {
      return dispatch(updateAppState(payload));
    }

    const { mergedAppState } = mergeAppState(currentState, payload);

    await urlStateStorage.set(APP_STATE_URL_KEY, mergedAppState, { replace: true });
  };

type GlobalStatePayload = TabActionPayload<Pick<TabState, 'globalState'>>;

const mergeGlobalState = (
  currentState: DiscoverInternalState,
  { tabId, globalState }: GlobalStatePayload
) => {
  const currentGlobalState = selectTab(currentState, tabId).globalState;
  const mergedGlobalState = { ...currentGlobalState, ...globalState };
  return {
    mergedGlobalState,
    hasStateChanges: !isEqualState(currentGlobalState, mergedGlobalState),
  };
};

export const updateGlobalState: InternalStateThunkActionCreator<[GlobalStatePayload]> =
  (payload) => async (dispatch, getState) => {
    const { mergedGlobalState, hasStateChanges } = mergeGlobalState(getState(), payload);

    if (hasStateChanges) {
      dispatch(
        internalStateSlice.actions.setGlobalState({
          tabId: payload.tabId,
          globalState: mergedGlobalState,
        })
      );
    }
  };

export const replaceGlobalState: InternalStateThunkActionCreator<
  [GlobalStatePayload],
  Promise<void>
> =
  (payload) =>
  async (dispatch, getState, { urlStateStorage }) => {
    const currentState = getState();

    if (currentState.tabs.unsafeCurrentId !== payload.tabId) {
      return dispatch(updateGlobalState(payload));
    }

    const { mergedGlobalState } = mergeGlobalState(currentState, payload);

    await urlStateStorage.set(GLOBAL_STATE_URL_KEY, mergedGlobalState, { replace: true });
  };
