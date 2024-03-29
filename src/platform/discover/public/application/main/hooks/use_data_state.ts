/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useState, useEffect } from 'react';
import { BehaviorSubject } from 'rxjs';
import { DataMsg } from '../services/discover_data_state_container';

export function useDataState<T extends DataMsg>(data$: BehaviorSubject<T>) {
  const [fetchState, setFetchState] = useState<T>(data$.getValue());

  useEffect(() => {
    const subscription = data$.subscribe((next) => {
      if (next.fetchStatus !== fetchState.fetchStatus) {
        setFetchState({ ...fetchState, ...next, ...(next.error ? {} : { error: undefined }) });
      }
    });
    return () => subscription.unsubscribe();
  }, [data$, fetchState, setFetchState]);
  return fetchState;
}
