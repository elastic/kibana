/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useCallback, useRef, useMemo, useEffect } from 'react';
import { Subject, Observable } from 'rxjs';

export const useAsyncValidationData = <T = any>(state?: T) => {
  const validationData$ = useRef<Subject<T>>();

  const getValidationData$ = useCallback(() => {
    if (validationData$.current === undefined) {
      validationData$.current = new Subject();
    }
    return validationData$.current;
  }, []);

  const hook: [Observable<T>, (value?: T) => void] = useMemo(() => {
    const subject = getValidationData$();

    const observable = subject.asObservable();
    const next = subject.next.bind(subject);

    return [observable, next];
  }, [getValidationData$]);

  // Whenever the state changes we update the observable
  useEffect(() => {
    getValidationData$().next(state);
  }, [state, getValidationData$]);

  return hook;
};
