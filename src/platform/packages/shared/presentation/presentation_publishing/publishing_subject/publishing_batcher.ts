/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useState } from 'react';
import { combineLatest, debounceTime, skip } from 'rxjs';
import type {
  AnyPublishingSubject,
  PublishingSubject,
  UnwrapPublishingSubjectTuple,
} from './types';

/**
 * Batches the latest values of multiple publishing subjects into a single object. Use this to avoid unnecessary re-renders.
 * Use when `subjects` are static and do not change over the lifetime of the component.
 *
 * Do not use when value is used as an input value to avoid debouncing user interactions
 *
 * @param subjects Publishing subjects array.
 */
export const useBatchedPublishingSubjects = <
  SubjectsType extends [...Array<PublishingSubject<any>>]
>(
  ...subjects: [...SubjectsType]
): UnwrapPublishingSubjectTuple<SubjectsType> => {
  /**
   * Set up latest published values state, initialized with the current values of the subjects.
   */
  const [latestPublishedValues, setLatestPublishedValues] = useState<
    UnwrapPublishingSubjectTuple<SubjectsType>
  >(() => unwrapPublishingSubjectArray(subjects));

  /**
   * Subscribe to all subjects and update the latest values when any of them change.
   *
   * Can not set up subscription in useEffect.
   * useEffect introduces a race condition where subscriptions may emit after values are set with useState
   * but before subscription is setup in useEffect.
   *
   * Can not set up subscription in useRef.
   * useRef executes initialization logic every render.
   */
  const subscription = useMemo(
    () =>
      combineLatest(subjects)
        .pipe(
          // When a new observer subscribes to a BehaviorSubject, it immediately receives the current value. Skip this emit.
          skip(1),
          debounceTime(0)
        )
        .subscribe((values) => {
          setLatestPublishedValues(values as UnwrapPublishingSubjectTuple<SubjectsType>);
        }),
    // 'subjects' gets a new reference on each call because of spread
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Clean up subscription on unmount.
   */
  useEffect(() => {
    return () => subscription.unsubscribe();
  }, [subscription]);

  return latestPublishedValues;
};

const unwrapPublishingSubjectArray = <T extends AnyPublishingSubject[]>(
  subjects: T
): UnwrapPublishingSubjectTuple<T> => {
  return subjects.map(
    (subject) => subject?.getValue?.() ?? undefined
  ) as UnwrapPublishingSubjectTuple<T>;
};
