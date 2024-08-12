/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
} from '@kbn/presentation-publishing';
import { HasSnapshottableState } from '../serialized_state';
import { apiHasSaveNotification } from '../has_save_notification';

export const COMPARATOR_SUBJECTS_DEBOUNCE = 100;

export const initializeUnsavedChanges = <RuntimeState extends {} = {}>(
  initialLastSavedState: RuntimeState,
  parentApi: unknown,
  comparators: StateComparators<RuntimeState>
) => {
  const subscriptions: Subscription[] = [];
  const lastSavedState$ = new BehaviorSubject<RuntimeState | undefined>(initialLastSavedState);

  const snapshotRuntimeState = () => {
    const comparatorKeys = Object.keys(comparators) as Array<keyof RuntimeState>;
    const snapshot = {} as RuntimeState;
    comparatorKeys.forEach((key) => {
      const comparatorSubject = comparators[key][0]; // 0th element of tuple is the subject
      snapshot[key] = comparatorSubject.value as RuntimeState[typeof key];
    });
    return snapshot;
  };

  if (apiHasSaveNotification(parentApi)) {
    subscriptions.push(
      // any time the parent saves, the current state becomes the last saved state...
      parentApi.saveNotification$.subscribe(() => {
        lastSavedState$.next(snapshotRuntimeState());
      })
    );
  }

  const comparatorSubjects: Array<PublishingSubject<unknown>> = [];
  const comparatorKeys: Array<keyof RuntimeState> = []; // index maps comparator subject to comparator key
  for (const key of Object.keys(comparators) as Array<keyof RuntimeState>) {
    const comparatorSubject = comparators[key][0]; // 0th element of tuple is the subject
    comparatorSubjects.push(comparatorSubject as PublishingSubject<unknown>);
    comparatorKeys.push(key);
  }

  const unsavedChanges = new BehaviorSubject<Partial<RuntimeState> | undefined>(
    runComparators(
      comparators,
      comparatorKeys,
      lastSavedState$.getValue() as RuntimeState,
      getInitialValuesFromComparators(comparators, comparatorKeys)
    )
  );

  subscriptions.push(
    combineLatest(comparatorSubjects)
      .pipe(
        debounceTime(COMPARATOR_SUBJECTS_DEBOUNCE),
        map((latestStates) =>
          comparatorKeys.reduce((acc, key, index) => {
            acc[key] = latestStates[index] as RuntimeState[typeof key];
            return acc;
          }, {} as Partial<RuntimeState>)
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
          setter(lastSaved?.[key] as RuntimeState[typeof key]);
        }
      },
      snapshotRuntimeState,
    } as PublishesUnsavedChanges<RuntimeState> & HasSnapshottableState<RuntimeState>,
    cleanup: () => {
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    },
  };
};
