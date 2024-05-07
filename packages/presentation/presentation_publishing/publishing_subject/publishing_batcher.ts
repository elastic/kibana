/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useRef, useState } from 'react';
import { combineLatest, debounceTime, skip } from 'rxjs';
import { AnyPublishingSubject, PublishingSubject, UnwrapPublishingSubjectTuple } from './types';

const hasSubjectsArrayChanged = (
  subjectsA: AnyPublishingSubject[],
  subjectsB: AnyPublishingSubject[]
) => {
  if (subjectsA.length !== subjectsB.length) return true;

  for (let i = 0; i < subjectsA.length; i++) {
    // here we only compare if the subjects are both either defined or undefined.
    if (Boolean(subjectsA[i]) !== Boolean(subjectsB[i])) return true;
  }
  return false;
};

/**
 * Batches the latest values of multiple publishing subjects into a single object. Use this to avoid unnecessary re-renders.
 * Use when `subjects` may not be defined on initial component render.
 *
 * @param subjects Publishing subjects array.
 *   When 'subjects' is expected to change, 'subjects' must be part of component react state.
 */
export const useBatchedOptionalPublishingSubjects = <
  SubjectsType extends [...AnyPublishingSubject[]]
>(
  ...subjects: [...SubjectsType]
): UnwrapPublishingSubjectTuple<SubjectsType> => {
  const isFirstRender = useRef(true);

  const previousSubjects = useRef<SubjectsType>(subjects);
  // Can not use 'useMemo' because 'subjects' gets a new reference on each call because of spread
  const subjectsToUse = (() => {
    // avoid rebuilding the subscription when the subjects are the same
    if (!hasSubjectsArrayChanged(previousSubjects.current ?? [], subjects)) {
      return previousSubjects.current;
    }
    previousSubjects.current = subjects;
    return subjects;
  })();

  /**
   * Set up latest published values state, initialized with the current values of the subjects.
   */
  const [latestPublishedValues, setLatestPublishedValues] = useState<
    UnwrapPublishingSubjectTuple<SubjectsType>
  >(() => unwrapPublishingSubjectArray(subjectsToUse));

  /**
   * Subscribe to all subjects and update the latest values when any of them change.
   */
  useEffect(() => {
    if (!isFirstRender.current) {
      setLatestPublishedValues(unwrapPublishingSubjectArray(subjectsToUse));
    } else {
      isFirstRender.current = false;
    }

    const definedSubjects: Array<PublishingSubject<unknown>> = [];
    const definedSubjectIndices: number[] = [];

    for (let i = 0; i < subjectsToUse.length; i++) {
      if (!subjectsToUse[i]) continue;
      definedSubjects.push(subjectsToUse[i] as PublishingSubject<unknown>);
      definedSubjectIndices.push(i);
    }
    if (definedSubjects.length === 0) return;
    const subscription = combineLatest(definedSubjects)
      .pipe(
        // When a new observer subscribes to a BehaviorSubject, it immediately receives the current value. Skip this emit.
        skip(1),
        debounceTime(0)
      )
      .subscribe((values) => {
        setLatestPublishedValues((lastPublishedValues) => {
          const newLatestPublishedValues: UnwrapPublishingSubjectTuple<SubjectsType> = [
            ...lastPublishedValues,
          ] as UnwrapPublishingSubjectTuple<SubjectsType>;
          for (let i = 0; i < values.length; i++) {
            newLatestPublishedValues[definedSubjectIndices[i]] = values[i] as never;
          }
          return newLatestPublishedValues;
        });
      });
    return () => subscription.unsubscribe();
  }, [subjectsToUse]);

  return latestPublishedValues;
};

/**
 * Batches the latest values of multiple publishing subjects into a single object. Use this to avoid unnecessary re-renders.
 * Use when `subjects` are static and do not change over the lifetime of the component.
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
   */
  useEffect(() => {
    const subscription = combineLatest(subjects)
      .pipe(
        // When a new observer subscribes to a BehaviorSubject, it immediately receives the current value. Skip this emit.
        skip(1),
        debounceTime(0)
      )
      .subscribe((values) => {
        setLatestPublishedValues(values as UnwrapPublishingSubjectTuple<SubjectsType>);
      });
    return () => subscription.unsubscribe();
    // 'subjects' gets a new reference on each call because of spread
    // Use 'useBatchedOptionalPublishingSubjects' when 'subjects' are expected to change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return latestPublishedValues;
};

const unwrapPublishingSubjectArray = <T extends AnyPublishingSubject[]>(
  subjects: T
): UnwrapPublishingSubjectTuple<T> => {
  return subjects.map(
    (subject) => subject?.getValue?.() ?? undefined
  ) as UnwrapPublishingSubjectTuple<T>;
};
