/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { distinctUntilChanged, map, type Observable, skip } from 'rxjs';
import { type DiscoverInternalState, selectTab, type TabState } from '../redux';
import { isEqualState } from './state_comparators';

export const createTabAppAndGlobalStatesObservable = ({
  tabId,
  internalState$,
  getState,
}: {
  tabId: string;
  internalState$: Observable<DiscoverInternalState>;
  getState: () => DiscoverInternalState;
}): Observable<Pick<TabState, 'appState' | 'globalState'>> => {
  const getTabState = (): Pick<TabState, 'appState' | 'globalState'> => {
    const tabState = selectTab(getState(), tabId);

    return {
      appState: tabState.appState,
      globalState: tabState.globalState,
    };
  };

  return internalState$.pipe(
    map(getTabState),
    distinctUntilChanged(
      (a, b) => isEqualState(a.appState, b.appState) && isEqualState(a.globalState, b.globalState)
    ),
    skip(1)
  );
};
