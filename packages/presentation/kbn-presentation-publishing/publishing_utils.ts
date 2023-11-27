/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { BehaviorSubject } from 'rxjs';

/**
 * A publishing subject is a subject that can be used to listen to value changes, but does not allow pushing values via the Next method.
 */
export type PublishingSubject<T extends unknown = unknown> = Omit<BehaviorSubject<T>, 'next'>;

/**
 * A utility type that makes a type optional if another passed in type is optional.
 */
export type OptionalIfOptional<TestType, Type> = undefined extends TestType
  ? Type | undefined
  : Type;

/**
 * Transforms any reactive variable into a publishing subject that can be used by other components
 * or actions to subscribe to changes in this piece of state.
 */
export const useSubjectFromReactiveVar = <T extends unknown = unknown>(
  value: T
): PublishingSubject<T> => {
  const subject = useMemo<BehaviorSubject<T>>(
    () => new BehaviorSubject<T>(value),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  useEffect(() => subject.next(value), [subject, value]);
  return subject;
};

/**
 * Extracts a reactive variable from a publishing subject. If the type of the provided subject extends undefined,
 * the returned value will be optional.
 */
export const useReactiveVarFromSubject = <
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

/**
 * Publishes any API to the passed in ref. Note that any API passed in will not be rebuilt on
 * subsequent renders, so it does not support reactive variables. Instead, pass in setter functions
 * and publishing subjects to allow other components to listen to changes.
 */
export const useApiPublisher = <ApiType extends unknown = unknown>(
  api: ApiType,
  ref: React.ForwardedRef<ApiType>
) => {
  const publishApi = useMemo(
    () => api,
    // disabling exhaustive deps because the API should be created once and never change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  useImperativeHandle(ref, () => publishApi);
};
