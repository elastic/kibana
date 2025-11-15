/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
