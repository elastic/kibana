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
 * operations keep `applyingChildState$` true until the last one finishes.
 */
export function initializeApplyingChildState() {
  const applyingChildState$ = new BehaviorSubject<boolean>(false);
  let inFlightCount = 0;

  /** Runs `work` with `applyingChildState$` true until `work` settles. */
  const setApplyingChildStateWhile = async <T>(work: () => MaybePromise<T>): Promise<T> => {
    if (inFlightCount++ === 0) applyingChildState$.next(true);
    try {
      return await work();
    } finally {
      if (--inFlightCount === 0) applyingChildState$.next(false);
    }
  };

  return { applyingChildState$, setApplyingChildStateWhile };
}
