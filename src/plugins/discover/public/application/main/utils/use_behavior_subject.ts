/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useRef } from 'react';
import { BehaviorSubject } from 'rxjs';

export function useBehaviorSubject<T>(props: T): BehaviorSubject<T> {
  const ref = useRef<BehaviorSubject<T> | null>(null);

  if (ref.current === null) {
    ref.current = new BehaviorSubject(props);
  }

  return ref.current;
}
