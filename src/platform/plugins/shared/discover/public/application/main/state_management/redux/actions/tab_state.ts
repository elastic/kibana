/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import { GLOBAL_STATE_URL_KEY } from '../../../../../../common/constants';
import { APP_STATE_URL_KEY } from '../../../../../../common';
import { isEqualState } from '../../utils/state_comparators';
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

/**
 * Partially update the tab app state, merging with existing state and pushing to URL history
 */
export const updateAppState: InternalStateThunkActionCreator<[AppStatePayload]> = (payload) =>
  async function updateAppStateThunkFn(dispatch, getState) {
    const { mergedAppState, hasStateChanges } = mergeAppState(getState(), payload);

    if (hasStateChanges) {
      dispatch(
        internalStateSlice.actions.setAppState({ tabId: payload.tabId, appState: mergedAppState })
      );
    }
  };

/**
 * Partially update the tab app state, merging with existing state and replacing URL history
 */
export const updateAppStateAndReplaceUrl: InternalStateThunkActionCreator<
  [AppStatePayload],
  Promise<void>
> = (payload) =>
  async function updateAppStateAndReplaceUrlThunkFn(dispatch, getState, { urlStateStorage }) {
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

/**
 * Partially update the tab global state, merging with existing state and pushing to URL history
 */
export const updateGlobalState: InternalStateThunkActionCreator<[GlobalStatePayload]> = (payload) =>
  async function updateGlobalStateThunkFn(dispatch, getState) {
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

/**
 * Partially update the tab global state, merging with existing state and replacing URL history
 */
export const updateGlobalStateAndReplaceUrl: InternalStateThunkActionCreator<
  [GlobalStatePayload],
  Promise<void>
> = (payload) =>
  async function updateGlobalStateAndReplaceUrlThunkFn(dispatch, getState, { urlStateStorage }) {
    const currentState = getState();

    if (currentState.tabs.unsafeCurrentId !== payload.tabId) {
      return dispatch(updateGlobalState(payload));
    }

    const { mergedGlobalState } = mergeGlobalState(currentState, payload);
    const globalUrlState: GlobalQueryStateFromUrl = {
      time: mergedGlobalState.timeRange,
      refreshInterval: mergedGlobalState.refreshInterval,
      filters: mergedGlobalState.filters,
    };

    await urlStateStorage.set(GLOBAL_STATE_URL_KEY, globalUrlState, { replace: true });
  };

/**
 * Push the current tab app state and global state to the URL, replacing URL history
 */
export const pushCurrentTabStateToUrl: InternalStateThunkActionCreator<
  [TabActionPayload],
  Promise<void>
> = ({ tabId }) =>
  async function pushCurrentTabStateToUrlThunkFn(dispatch) {
    await Promise.all([
      dispatch(updateGlobalStateAndReplaceUrl({ tabId, globalState: {} })),
      dispatch(updateAppStateAndReplaceUrl({ tabId, appState: {} })),
    ]);
  };
