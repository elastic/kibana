/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs';
import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';

export type BehaviorObservable<T> = Omit<BehaviorSubject<T>, 'next'>;

export function useStateSelector<S, R>(
  state$: BehaviorObservable<S>,
  selector: (state: S) => R,
  equalityFn?: (arg0: R, arg1: R) => boolean
) {
  const memoizedObservable = useMemo(
    () => state$.pipe(map(selector), distinctUntilChanged(equalityFn)),
    [state$, selector, equalityFn]
  );
  const defaultValue = useMemo(() => selector(state$.value), [selector, state$]);
  return useObservable(memoizedObservable, defaultValue);
}
