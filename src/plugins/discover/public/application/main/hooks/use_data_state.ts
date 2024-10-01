/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useEffect } from 'react';
import { BehaviorSubject } from 'rxjs';
import { DataMsg } from '../state_management/discover_data_state_container';
import { FetchStatus } from '../../types';

function hasUpdatedResultWhenComplete<T extends DataMsg>(next: T, current: T) {
  if (next.fetchStatus === FetchStatus.COMPLETE && 'result' in next && 'result' in current) {
    return next.result !== current.result;
  }
  return false;
}

export function useDataState<T extends DataMsg>(data$: BehaviorSubject<T>) {
  const [fetchState, setFetchState] = useState<T>({ fetchStatus: FetchStatus.UNINITIALIZED } as T);

  useEffect(() => {
    const subscription = data$.subscribe((next) => {
      // Do not look just into status, but also in the result is available
      // if the fetch doesn't emit a partial status, then it will never update its result
      if (
        next.fetchStatus !== fetchState.fetchStatus ||
        hasUpdatedResultWhenComplete(next, fetchState)
      ) {
        setFetchState({ ...fetchState, ...next, ...(next.error ? {} : { error: undefined }) });
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchState, setFetchState, data$]);
  return fetchState;
}
