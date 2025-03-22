/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Observable, combineLatest, combineLatestWith, debounceTime, map } from 'rxjs';
import { StateComparators } from './types';
import { PublishingSubject } from '../publishing_subject';
import { runComparators } from './state_comparators';

export const COMPARATOR_SUBJECTS_DEBOUNCE = 100;

export const diffComparators$ = <RuntimeState extends object = object>(
  lastSavedState$: PublishingSubject<RuntimeState | undefined>,
  comparators: StateComparators<RuntimeState>
): Observable<Partial<RuntimeState> | undefined> => {
  const comparatorKeys = Object.keys(comparators) as Array<keyof RuntimeState>;
  const comparatorSubjects = comparatorKeys.map((key) => comparators[key][0]); // 0th element of tuple is the subject

  return combineLatest(comparatorSubjects).pipe(
    debounceTime(COMPARATOR_SUBJECTS_DEBOUNCE),
    map((latestStates) =>
      comparatorKeys.reduce((acc, key, index) => {
        acc[key] = latestStates[index] as RuntimeState[typeof key];
        return acc;
      }, {} as Partial<RuntimeState>)
    ),
    combineLatestWith(lastSavedState$),
    map(([latestState, lastSavedState]) =>
      runComparators(comparators, comparatorKeys, lastSavedState, latestState)
    )
  );
};
