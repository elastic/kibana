/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useState, useEffect } from 'react';
import { BehaviorSubject } from 'rxjs';
import { DataMsg } from './use_saved_search';

export function useDataState(data$: BehaviorSubject<DataMsg>) {
  const [fetchState, setFetchState] = useState<DataMsg>(data$.getValue());

  useEffect(() => {
    const subscription = data$.subscribe((next) => {
      if (next.fetchStatus !== fetchState.fetchStatus) {
        setFetchState({ ...fetchState, ...next });
      }
    });
    return () => subscription.unsubscribe();
  }, [data$, fetchState, setFetchState]);
  return fetchState;
}
