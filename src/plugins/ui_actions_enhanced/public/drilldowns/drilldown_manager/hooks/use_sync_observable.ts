/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo, useRef } from 'react';
import useIsomorphicLayoutEffect from 'react-use/lib/useIsomorphicLayoutEffect';
import useUpdate from 'react-use/lib/useUpdate';
import { Observable, Subscription } from 'rxjs';

export const useSyncObservable = <T>(observable: Observable<T>): T => {
  const firstRef = useRef<boolean>(true);
  const valueRef = useRef<T>();
  const update = useUpdate();
  const subscriptionRef = useRef<Subscription | undefined>(undefined);
  subscriptionRef.current = useMemo(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = undefined;
      firstRef.current = true;
    }
    return observable.subscribe((value) => {
      valueRef.current = value;
      if (firstRef.current) firstRef.current = false;
      update();
    });
  }, [observable, update]);
  useIsomorphicLayoutEffect(
    () => () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    },
    []
  );
  return valueRef.current!;
};
