/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  notifyManager,
  QueryObserver,
  QueryObserverOptions,
  QueryObserverResult,
  QueryClient,
  QueryKey,
} from '@tanstack/react-query';
import { Observable } from 'rxjs';

export const createQueryObservable = <
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  queryClient: QueryClient,
  queryOptions: QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>
) => {
  const queryObserver = new QueryObserver(
    queryClient,
    queryClient.defaultQueryOptions(queryOptions)
  );

  return new Observable<QueryObserverResult<TData, TError>>((subscriber) => {
    const unsubscribe = queryObserver.subscribe(
      // notifyManager is a singleton that batches updates across react query
      notifyManager.batchCalls((result) => {
        subscriber.next(result);
      })
    );
    return () => {
      unsubscribe();
    };
  });
};
