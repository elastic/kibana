/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { MaybePromise } from '@kbn/utility-types';

/**
 * Tracks whether async child state work is in flight. Reference counted, so overlapping
 * operations keep `childrenStateLoading$` true until the last one finishes.
 */
export function initializeChildrenStateLoading() {
  const childrenStateLoading$ = new BehaviorSubject<boolean>(false);
  let inFlightCount = 0;

  /**
   * Sets children state loading while this runs: `childrenStateLoading$` is true, synchronously,
   * until `work` settles. Resolves with the result of `work` and rejects if it throws.
   */
  const setChildrenStateLoadingWhile = async <T>(work: () => MaybePromise<T>): Promise<T> => {
    if (inFlightCount++ === 0) childrenStateLoading$.next(true);
    try {
      return await work();
    } finally {
      if (--inFlightCount === 0) childrenStateLoading$.next(false);
    }
  };

  return { childrenStateLoading$, setChildrenStateLoadingWhile };
}
