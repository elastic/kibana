/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apiHasSaveNotification } from '@kbn/presentation-containers';
import {
  BehaviorSubject,
  combineLatest,
  combineLatestWith,
  debounceTime,
  map,
  Subscription,
} from 'rxjs';
import {
  getInitialValuesFromComparators,
  PublishesUnsavedChanges,
  PublishingSubject,
  runComparators,
  StateComparators,
} from '../..';

export const COMPARATOR_SUBJECTS_DEBOUNCE = 100;

export const initializeUnsavedChanges = <State extends {} = {}>(
  initialState: State,
  parentApi: unknown,
  comparators: StateComparators<State>
) => {
  const subscriptions: Subscription[] = [];
  const lastSavedState$ = new BehaviorSubject<State | undefined>(initialState);

  const snapshotState = () => {
    const comparatorKeys = Object.keys(comparators) as Array<keyof State>;
    const snapshot = {} as State;
    comparatorKeys.forEach((key) => {
      const comparatorSubject = comparators[key][0]; // 0th element of tuple is the subject
      snapshot[key] = comparatorSubject.value as State[typeof key];
    });
    return snapshot;
  };

  if (apiHasSaveNotification(parentApi)) {
    subscriptions.push(
      // any time the parent saves, the current state becomes the last saved state...
      parentApi.saveNotification$.subscribe(() => {
        lastSavedState$.next(snapshotState());
      })
    );
  }

  const comparatorSubjects: Array<PublishingSubject<unknown>> = [];
  const comparatorKeys: Array<keyof State> = []; // index maps comparator subject to comparator key
  for (const key of Object.keys(comparators) as Array<keyof State>) {
    const comparatorSubject = comparators[key][0]; // 0th element of tuple is the subject
    comparatorSubjects.push(comparatorSubject as PublishingSubject<unknown>);
    comparatorKeys.push(key);
  }

  const unsavedChanges = new BehaviorSubject<Partial<State> | undefined>(
    runComparators(
      comparators,
      comparatorKeys,
      lastSavedState$.getValue() as State,
      getInitialValuesFromComparators(comparators, comparatorKeys)
    )
  );

  subscriptions.push(
    combineLatest(comparatorSubjects)
      .pipe(
        debounceTime(COMPARATOR_SUBJECTS_DEBOUNCE),
        map((latestStates) =>
          comparatorKeys.reduce((acc, key, index) => {
            acc[key] = latestStates[index] as State[typeof key];
            return acc;
          }, {} as Partial<State>)
        ),
        combineLatestWith(lastSavedState$)
      )
      .subscribe(([latestState, lastSavedState]) => {
        unsavedChanges.next(
          runComparators(comparators, comparatorKeys, lastSavedState, latestState)
        );
      })
  );

  return {
    api: {
      unsavedChanges,
      resetUnsavedChanges: () => {
        const lastSaved = lastSavedState$.getValue();
        for (const key of comparatorKeys) {
          const setter = comparators[key][1]; // setter function is the 1st element of the tuple
          setter(lastSaved?.[key] as State[typeof key]);
        }
      },
    } as PublishesUnsavedChanges,
    cleanup: () => {
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    },
    snapshotState,
  };
};
