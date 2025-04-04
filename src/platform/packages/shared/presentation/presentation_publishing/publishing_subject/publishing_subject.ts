/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useState } from 'react';
import { BehaviorSubject, skip } from 'rxjs';
import { PublishingSubject, ValueFromPublishingSubject } from './types';

/**
 * Declares a publishing subject, allowing external code to subscribe to react state changes.
 * Changes to state fire subject.next
 * @param state React state from useState hook.
 */
export const usePublishingSubject = <T extends unknown = unknown>(
  state: T
): PublishingSubject<T> => {
  const subject = useMemo<BehaviorSubject<T>>(
    () => new BehaviorSubject<T>(state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  useEffect(() => subject.next(state), [subject, state]);
  return subject;
};

/**
 * Declares a state variable that is synced with a publishing subject value.
 * @param subject Publishing subject.
 */
export const useStateFromPublishingSubject = <SubjectType extends PublishingSubject<any>>(
  subject: SubjectType
): ValueFromPublishingSubject<SubjectType> => {
  const [value, setValue] = useState<ValueFromPublishingSubject<SubjectType>>(subject.getValue());

  const subscription = useMemo(() => {
    // When a new observer subscribes to a BehaviorSubject, it immediately receives the current value. Skip this emit.
    return subject.pipe(skip(1)).subscribe((newValue) => setValue(newValue));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => subscription.unsubscribe();
  }, [subscription]);

  return value;
};
