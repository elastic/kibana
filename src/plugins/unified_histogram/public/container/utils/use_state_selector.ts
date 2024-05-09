/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs';
import { useEffect, useState } from 'react';

export const useStateSelector = <S, R>(
  state$: Observable<S> | undefined,
  selector: (state: S) => R,
  equalityFn?: (arg0: R, arg1: R) => boolean
) => {
  const [state, setState] = useState<R>();

  useEffect(() => {
    const subscription = state$
      ?.pipe(map(selector), distinctUntilChanged(equalityFn))
      .subscribe(setState);

    return () => {
      subscription?.unsubscribe();
    };
  }, [equalityFn, selector, state$]);

  return state;
};
