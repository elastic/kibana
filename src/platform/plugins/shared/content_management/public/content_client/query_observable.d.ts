/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  QueryObserverOptions,
  QueryObserverResult,
  QueryClient,
  QueryKey,
} from '@kbn/react-query';
import type { Observable } from 'rxjs';
export declare const createQueryObservable: <
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  queryClient: QueryClient,
  queryOptions: QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>
) => Observable<QueryObserverResult<TData, TError>>;
