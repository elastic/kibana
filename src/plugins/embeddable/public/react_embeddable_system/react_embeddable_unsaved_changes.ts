/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getLastSavedStateSubjectForChild } from '@kbn/presentation-containers';
import { PublishingSubject } from '@kbn/presentation-publishing';
import { useCallback, useEffect, useMemo } from 'react';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { combineLatestWith, debounceTime, map } from 'rxjs/operators';
import { useReactEmbeddableParentContext } from './react_embeddable_api';
import { EmbeddableStateComparators, ReactEmbeddableFactory } from './types';

const defaultComparator = <T>(a: T, b: T) => a === b;

const getInitialValuesFromComparators = <StateType extends object = object>(
  comparators: EmbeddableStateComparators<StateType>,
  comparatorKeys: Array<keyof StateType>
) => {
  const initialValues: Partial<StateType> = {};
  for (const key of comparatorKeys) {
    const comparatorSubject = comparators[key][0]; // 0th element of tuple is the subject
    initialValues[key] = comparatorSubject?.value;
  }
  return initialValues;
};

const runComparators = <StateType extends object = object>(
  comparators: EmbeddableStateComparators<StateType>,
  comparatorKeys: Array<keyof StateType>,
  lastSavedState: StateType | undefined,
  latestState: Partial<StateType>
) => {
  if (!lastSavedState) {
    // if the parent API provides last saved state, but it's empty for this panel, all of our latest state is unsaved.
    return latestState;
  }
  const latestChanges: Partial<StateType> = {};
  for (const key of comparatorKeys) {
    const customComparator = comparators[key]?.[2]; // 2nd element of the tuple is the custom comparator
    const comparator = customComparator ?? defaultComparator;
    if (!comparator(lastSavedState?.[key], latestState[key], lastSavedState, latestState)) {
      latestChanges[key] = latestState[key];
    }
  }
  return Object.keys(latestChanges).length > 0 ? latestChanges : undefined;
};

export const useReactEmbeddableUnsavedChanges = <StateType extends object = object>(
  uuid: string,
  factory: ReactEmbeddableFactory<StateType>,
  comparators: EmbeddableStateComparators<StateType>
) => {
  const { parentApi } = useReactEmbeddableParentContext() ?? {};
  const lastSavedStateSubject = useMemo(
    () => getLastSavedStateSubjectForChild<StateType>(parentApi, uuid, factory.deserializeState),
    [factory.deserializeState, parentApi, uuid]
  );

  const { comparatorSubjects, comparatorKeys } = useMemo(() => {
    const subjects: Array<PublishingSubject<unknown>> = [];
    const keys: Array<keyof StateType> = [];
    for (const key of Object.keys(comparators) as Array<keyof StateType>) {
      const comparatorSubject = comparators[key][0]; // 0th element of tuple is the subject
      subjects.push(comparatorSubject as PublishingSubject<unknown>);
      keys.push(key);
    }
    return { comparatorKeys: keys, comparatorSubjects: subjects };
    // disable exhaustive deps because the comparators must be static
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * set up unsaved changes subject, running an initial diff. If the parent API cannot provide
   * last saved state, we return undefined.
   */
  const unsavedChanges = useMemo(
    () =>
      new BehaviorSubject<Partial<StateType> | undefined>(
        lastSavedStateSubject
          ? runComparators(
              comparators,
              comparatorKeys,
              lastSavedStateSubject?.getValue(),
              getInitialValuesFromComparators(comparators, comparatorKeys)
            )
          : undefined
      ),
    // disable exhaustive deps because the comparators must be static
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    if (!lastSavedStateSubject) return;
    // subscribe to last saved state subject and all state comparators
    const subscription = combineLatest(comparatorSubjects)
      .pipe(
        debounceTime(100),
        map((latestStates) =>
          comparatorKeys.reduce((acc, key, index) => {
            acc[key] = latestStates[index] as StateType[typeof key];
            return acc;
          }, {} as Partial<StateType>)
        ),
        combineLatestWith(lastSavedStateSubject)
      )
      .subscribe(([latestStates, lastSavedState]) => {
        unsavedChanges.next(
          runComparators(comparators, comparatorKeys, lastSavedState, latestStates)
        );
      });
    return () => subscription.unsubscribe();
    // disable exhaustive deps because the comparators must be static
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetUnsavedChanges = useCallback(() => {
    const lastSaved = lastSavedStateSubject?.getValue();
    for (const key of comparatorKeys) {
      const setter = comparators[key][1]; // setter function is the 1st element of the tuple
      setter(lastSaved?.[key] as StateType[typeof key]);
    }

    // disable exhaustive deps because the comparators must be static
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { unsavedChanges, resetUnsavedChanges };
};
