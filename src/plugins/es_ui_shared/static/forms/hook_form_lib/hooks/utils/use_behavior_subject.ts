/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useCallback, useRef, useMemo } from 'react';
import { BehaviorSubject, Observable } from 'rxjs';

export const useBehaviorSubject = <T = any>(initialState: T) => {
  const subjectRef = useRef<BehaviorSubject<T>>();

  const getSubject$ = useCallback(() => {
    if (subjectRef.current === undefined) {
      subjectRef.current = new BehaviorSubject<T>(initialState);
    }
    return subjectRef.current;
  }, [initialState]);

  const hook: [Observable<T>, (value: T) => void] = useMemo(() => {
    const subject = getSubject$();

    const observable = subject.asObservable();
    const next = subject.next.bind(subject);

    return [observable, next];
  }, [getSubject$]);

  return hook;
};
