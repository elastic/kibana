/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
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
 * You should avoid using this hook with subjects that your component pushes values to on user interaction, as it can cause a slight delay.
 * @param subjects Publishing subjects array.
 *   When 'subjects' is expected to change, 'subjects' must be part of component react state.
 */
export const useBatchedPublishingSubjects = <SubjectsType extends [...AnyPublishingSubject[]]>(
  ...subjects: [...SubjectsType]
): UnwrapPublishingSubjectTuple<SubjectsType> => {
  const isFirstRender = useRef(true);
  /**
   * memoize and deep diff subjects to avoid rebuilding the subscription when the subjects are the same.
   */
  const previousSubjects = useRef<SubjectsType>(subjects);
  const subjectsToUse = useMemo(() => {
    if (!hasSubjectsArrayChanged(previousSubjects.current ?? [], subjects)) {
      return previousSubjects.current;
    }
    previousSubjects.current = subjects;
    return subjects;
  }, [subjects]);

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

const unwrapPublishingSubjectArray = <T extends AnyPublishingSubject[]>(
  subjects: T
): UnwrapPublishingSubjectTuple<T> => {
  return subjects.map(
    (subject) => subject?.getValue?.() ?? undefined
  ) as UnwrapPublishingSubjectTuple<T>;
};
