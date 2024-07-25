/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apiHasSaveNotification } from '@kbn/presentation-containers';
import {
  getInitialValuesFromComparators,
  PublishesUnsavedChanges,
  PublishingSubject,
  runComparators,
  StateComparators,
} from '@kbn/presentation-publishing';
import {
  BehaviorSubject,
  combineLatest,
  combineLatestWith,
  debounceTime,
  map,
  Subscription,
} from 'rxjs';
import { DefaultControlState } from './types';

export const COMPARATOR_SUBJECTS_DEBOUNCE = 100;

export const initializeUnsavedChangesApi = <
  ControlState extends DefaultControlState = DefaultControlState
>(
  initialState: ControlState,
  parentApi: unknown,
  comparators: StateComparators<ControlState>
) => {
  const subscriptions: Subscription[] = [];
  const lastSavedState$ = new BehaviorSubject<ControlState | undefined>(initialState);
  if (apiHasSaveNotification(parentApi)) {
    subscriptions.push(
      // any time the parent saves, the current state becomes the last saved state...
      parentApi.saveNotification$.subscribe(() => {
        const controlState = {} as ControlState;
        (Object.keys(comparators) as Array<keyof ControlState>).forEach((key) => {
          const comparatorSubject = comparators[key][0]; // 0th element of tuple is the subject
          controlState[key] = comparatorSubject.value as ControlState[typeof key];
        });
        lastSavedState$.next(controlState);
      })
    );
  }

  const comparatorSubjects: Array<PublishingSubject<unknown>> = [];
  const comparatorKeys: Array<keyof ControlState> = []; // index maps comparator subject to comparator key
  for (const key of Object.keys(comparators) as Array<keyof ControlState>) {
    const comparatorSubject = comparators[key][0]; // 0th element of tuple is the subject
    comparatorSubjects.push(comparatorSubject as PublishingSubject<unknown>);
    comparatorKeys.push(key);
  }

  const unsavedChanges = new BehaviorSubject<Partial<ControlState> | undefined>(
    runComparators(
      comparators,
      comparatorKeys,
      lastSavedState$.getValue() as ControlState,
      getInitialValuesFromComparators(comparators, comparatorKeys)
    )
  );

  subscriptions.push(
    combineLatest(comparatorSubjects)
      .pipe(
        debounceTime(COMPARATOR_SUBJECTS_DEBOUNCE),
        map((latestStates) =>
          comparatorKeys.reduce((acc, key, index) => {
            acc[key] = latestStates[index] as ControlState[typeof key];
            return acc;
          }, {} as Partial<ControlState>)
        ),
        combineLatestWith(lastSavedState$)
      )
      .subscribe(([latestState, nextLastSavedState]) => {
        unsavedChanges.next(
          runComparators(comparators, comparatorKeys, nextLastSavedState, latestState)
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
          setter(lastSaved?.[key] as ControlState[typeof key]);
        }
      },
    } as PublishesUnsavedChanges,
    cleanup: () => {
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    },
  };
};
