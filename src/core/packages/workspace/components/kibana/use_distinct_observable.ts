/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState, useRef } from 'react';
import { Observable } from 'rxjs';
import deepEqual from 'fast-deep-equal/react';

export function useDistinctObservable<T>(observable$: Observable<T>, initialValue: T): T {
  const [value, setValue] = useState(initialValue);
  const previousValueRef = useRef<T>(initialValue);

  useEffect(() => {
    const subscription = observable$.subscribe((newValue) => {
      if (!deepEqual(newValue, previousValueRef.current)) {
        previousValueRef.current = newValue;
        setValue(newValue);
      }
    });
    return () => subscription.unsubscribe();
  }, [observable$]);

  return value;
}
