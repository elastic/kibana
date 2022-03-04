/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useState } from 'react';
import { Observable } from 'rxjs';

export const useStateObservable = <T extends {} = {}>(
  stateObservable: Observable<T>,
  initialState: T
) => {
  const [innerState, setInnerState] = useState<T>(initialState);
  useEffect(() => {
    const subscription = stateObservable.subscribe((newState) => setInnerState(newState));
    return () => subscription.unsubscribe();
  }, [stateObservable]);

  return innerState;
};
