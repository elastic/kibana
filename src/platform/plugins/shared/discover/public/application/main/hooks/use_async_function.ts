/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AsyncState } from 'react-use/lib/useAsyncFn';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import useLatest from 'react-use/lib/useLatest';
import type { FunctionReturningPromise } from 'react-use/lib/misc/types';

type NarrowAsyncState<TState extends AsyncState<unknown>> = Exclude<
  TState,
  { error?: undefined; value?: undefined }
>;

export const useAsyncFunction = <T extends FunctionReturningPromise>(
  asyncFunction: T,
  initialState: AsyncState<Awaited<ReturnType<T>>> = { loading: true }
) => {
  const latestFunction = useLatest(asyncFunction);
  const [state, returnFunction] = useAsyncFn(
    ((...params) => latestFunction.current(...params)) as T,
    [latestFunction],
    initialState
  );
  const castedState = state as NarrowAsyncState<typeof state>;

  return [castedState, returnFunction] as const;
};
