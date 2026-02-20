/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { distinctUntilChanged, map, type Observable, skip } from 'rxjs';
import { isEqual } from 'lodash';
import { type DiscoverInternalState, type DiscoverAppState, selectTabAppState } from '../redux';

export const createTabAppStateObservable = ({
  tabId,
  internalState$,
  getState,
}: {
  tabId: string;
  internalState$: Observable<DiscoverInternalState>;
  getState: () => DiscoverInternalState;
}) => {
  const getAppState = (): DiscoverAppState => {
    return selectTabAppState(getState(), tabId);
  };

  const appState$ = internalState$.pipe(
    map(getAppState),
    distinctUntilChanged((a, b) => isEqual(a, b)),
    skip(1)
  );

  return appState$;
};
