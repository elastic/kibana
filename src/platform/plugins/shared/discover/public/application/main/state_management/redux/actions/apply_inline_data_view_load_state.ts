/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import { APP_STATE_URL_KEY, GLOBAL_STATE_URL_KEY } from '../../../../../../common/constants';
import type { InitialTabState } from '../../../../../plugin_imports/initial_tab_state_service';
import { type AppStateUrl, cleanupUrlState } from '../../utils/cleanup_url_state';
import {
  prepareInlineDataViewLoadState,
  type NormalizedInlineDataViewIds,
} from '../../utils/normalize_inline_data_view_ids';
import type { InternalStateThunkActionCreator } from '../internal_state';
import type { TabState } from '../types';
import { setAdHocDataViews } from './data_views';

interface ApplyInlineDataViewLoadStateParams {
  normalized: NormalizedInlineDataViewIds;
  selectedTab: TabState | undefined;
  initialTabState: InitialTabState | undefined;
}

/** Applies prepared inline identities to URL, runtime and navigation state before tabs initialize. */
export const applyInlineDataViewLoadState: InternalStateThunkActionCreator<
  [ApplyInlineDataViewLoadStateParams],
  Promise<void>
> = ({ normalized, selectedTab, initialTabState }) =>
  async function applyInlineDataViewLoadStateThunkFn(
    dispatch,
    _,
    { services, runtimeStateManager, urlStateStorage }
  ) {
    // Migrate legacy keys such as index as tab initialization does, before remapping references.
    const urlAppState = cleanupUrlState(
      urlStateStorage.get<AppStateUrl>(APP_STATE_URL_KEY),
      services.uiSettings
    );
    const urlGlobalState =
      urlStateStorage.get<GlobalQueryStateFromUrl>(GLOBAL_STATE_URL_KEY) ?? undefined;
    const prepared = prepareInlineDataViewLoadState({
      normalized,
      selectedTab,
      urlAppState,
      urlGlobalState,
      initialTabState,
    });

    const urlUpdates: Array<Promise<string | undefined>> = [];
    if (prepared.urlAppState !== urlAppState) {
      urlUpdates.push(
        urlStateStorage.set(APP_STATE_URL_KEY, prepared.urlAppState, { replace: true })
      );
    }

    if (prepared.urlGlobalState !== urlGlobalState) {
      urlUpdates.push(
        urlStateStorage.set(GLOBAL_STATE_URL_KEY, prepared.urlGlobalState, { replace: true })
      );
    }
    await Promise.all(urlUpdates);

    if (prepared.dataViewIdsToRemove.length) {
      const adHocDataViews = runtimeStateManager.adHocDataViews$.getValue();
      const remainingAdHocDataViews = adHocDataViews.filter(
        ({ id }) => id === undefined || !prepared.dataViewIdsToRemove.includes(id)
      );
      if (remainingAdHocDataViews.length !== adHocDataViews.length) {
        dispatch(setAdHocDataViews(remainingAdHocDataViews));
      }
    }

    // Keep location state for tab initialization before the selected-tab URL update discards it.
    services.initialTabStateService.capture(prepared.initialTabState);
  };
