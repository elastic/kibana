/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { combineLatest } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';
import { PublishingSubject } from './publishing_subject';

// Usage of any required here. We want to subscribe to the subject no matter the type.
type AnyValue = any;
type AnyPublishingSubject = PublishingSubject<AnyValue>;

interface PublishingSubjectCollection {
  [key: string]: AnyPublishingSubject | undefined;
}

interface RequiredPublishingSubjectCollection {
  [key: string]: AnyPublishingSubject;
}

type PublishingSubjectBatchResult<SubjectsType extends PublishingSubjectCollection> = {
  [SubjectKey in keyof SubjectsType]?: SubjectsType[SubjectKey] extends
    | PublishingSubject<infer ValueType>
    | undefined
    ? ValueType
    : never;
};

const hasSubjectsObjectChanged = (
  subjectsA: PublishingSubjectCollection,
  subjectsB: PublishingSubjectCollection
) => {
  const subjectKeysA = Object.keys(subjectsA);
  const subjectKeysB = Object.keys(subjectsB);
  if (subjectKeysA.length !== subjectKeysB.length) return true;

  for (const key of subjectKeysA) {
    if (Boolean(subjectsA[key]) !== Boolean(subjectsB[key])) return true;
  }
  return false;
};

/**
 * Batches the latest values of multiple publishing subjects into a single object. Use this to avoid unnecessary re-renders.
 * You should avoid using this hook with subjects that your component pushes values to on user interaction, as it can cause a slight delay.
 */
export const useBatchedPublishingSubjects = <SubjectsType extends PublishingSubjectCollection>(
  subjects: SubjectsType
): PublishingSubjectBatchResult<SubjectsType> => {
  /**
   * memoize and deep diff subjects to avoid rebuilding the subscription when the subjects are the same.
   */
  const previousSubjects = useRef<SubjectsType | null>(null);

  const subjectsToUse = useMemo(() => {
    if (!previousSubjects.current && !Object.values(subjects).some((subject) => Boolean(subject))) {
      // if the previous subjects were null and none of the new subjects are defined, return null to avoid building the subscription.
      return null;
    }

    if (!hasSubjectsObjectChanged(previousSubjects.current ?? {}, subjects)) {
      return previousSubjects.current;
    }
    previousSubjects.current = subjects;
    return subjects;
  }, [subjects]);

  /**
   * Extract only defined subjects from any subjects passed in.
   */
  const { definedKeys, definedSubjects } = useMemo(() => {
    if (!subjectsToUse) return {};
    const definedSubjectsMap: RequiredPublishingSubjectCollection =
      Object.keys(subjectsToUse).reduce((acc, key) => {
        if (Boolean(subjectsToUse[key])) acc[key] = subjectsToUse[key] as AnyPublishingSubject;
        return acc;
      }, {} as RequiredPublishingSubjectCollection) ?? {};

    return {
      definedKeys: Object.keys(definedSubjectsMap ?? {}) as Array<keyof SubjectsType>,
      definedSubjects: Object.values(definedSubjectsMap) ?? [],
    };
  }, [subjectsToUse]);

  const [latestPublishedValues, setLatestPublishedValues] = useState<
    PublishingSubjectBatchResult<SubjectsType>
  >(() => {
    if (!definedKeys?.length || !definedSubjects?.length) return {};
    const nextResult: PublishingSubjectBatchResult<SubjectsType> = {};
    for (let keyIndex = 0; keyIndex < definedKeys.length; keyIndex++) {
      nextResult[definedKeys[keyIndex]] = definedSubjects[keyIndex].value ?? undefined;
    }
    return nextResult;
  });

  /**
   * Subscribe to all subjects and update the latest values when any of them change.
   */
  useEffect(() => {
    if (!definedSubjects?.length || !definedKeys?.length) return;
    const subscription = combineLatest(definedSubjects)
      .pipe(
        // debounce latest state for 0ms to flush all in-flight changes
        debounceTime(0),
        filter((changes) => changes.length > 0)
      )
      .subscribe((latestValues) => {
        const nextResult: PublishingSubjectBatchResult<SubjectsType> = {};
        for (let keyIndex = 0; keyIndex < definedKeys.length; keyIndex++) {
          nextResult[definedKeys[keyIndex]] = latestValues[keyIndex] ?? undefined;
        }
        setLatestPublishedValues(nextResult);
      });

    return () => subscription.unsubscribe();
  }, [definedKeys, definedSubjects]);

  return latestPublishedValues;
};
