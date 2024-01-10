/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useMemo, useState } from 'react';
import { BehaviorSubject } from 'rxjs';

/**
 * A publishing subject is a RxJS subject that can be used to listen to value changes, but does not allow pushing values via the Next method.
 */
export type PublishingSubject<T extends unknown = unknown> = Omit<BehaviorSubject<T>, 'next'>;

/**
 * A utility type that makes a type optional if another passed in type is optional.
 */
type OptionalIfOptional<TestType, Type> = undefined extends TestType ? Type | undefined : Type;

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
export const useStateFromPublishingSubject = <
  ValueType extends unknown = unknown,
  SubjectType extends PublishingSubject<ValueType> | undefined =
    | PublishingSubject<ValueType>
    | undefined
>(
  subject?: SubjectType
): OptionalIfOptional<SubjectType, ValueType> => {
  const [value, setValue] = useState<ValueType | undefined>(subject?.getValue());
  useEffect(() => {
    if (!subject) return;
    const subscription = subject.subscribe((newValue) => setValue(newValue));
    return () => subscription.unsubscribe();
  }, [subject]);
  return value as OptionalIfOptional<SubjectType, ValueType>;
};
