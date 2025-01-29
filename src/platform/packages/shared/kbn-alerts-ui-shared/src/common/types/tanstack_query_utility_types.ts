/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UseQueryOptions } from '@tanstack/react-query';

/**
 * Extracts the data type from a fetching function
 */
export type FetchFnData<TFetchFn> = TFetchFn extends (...args: any) => Promise<infer TData>
  ? TData
  : TFetchFn extends (...args: any) => infer TData
  ? TData
  : never;

/**
 * A utility type used to correctly type options overrides for `useQuery`
 */
export type QueryOptionsOverrides<
  /**
   * The fetching function type. TData is calculated based on this type.
   */
  TFetchFn,
  TQueryFnData = FetchFnData<TFetchFn>,
  TError = unknown,
  TData = TQueryFnData
> = Omit<
  UseQueryOptions<TQueryFnData, TError, TData, string[]>,
  'queryKey' | 'queryFn' | 'initialData'
>;
