/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  apiHasSaveNotification,
  HasSaveNotification,
  HasSerializedChildState,
} from '@kbn/presentation-containers';
import {
  getInitialValuesFromComparators,
  runComparators,
  StateComparators,
} from '@kbn/presentation-publishing';
import {
  BehaviorSubject,
  combineLatest,
  combineLatestWith,
  debounceTime,
  map,
  Observable,
  Subscription,
} from 'rxjs';
import { DefaultControlState } from './types';

export const COMPARATOR_SUBJECTS_DEBOUNCE = 100;

export const initializeControlState = <
  ControlState extends DefaultControlState = DefaultControlState
>(
  uuid: string,
  parentApi: HasSerializedChildState<ControlState> & Partial<HasSaveNotification>
) => {
  const serializedState = parentApi.getSerializedStateForChild(uuid);
  const lastSavedState = serializedState ? serializedState.rawState : ({} as ControlState);

  return {
    initialState: lastSavedState,
    startStateDiffing: (comparators: StateComparators<ControlState>) => {
      const subscriptions: Subscription[] = [];
      const comparatorKeys = Object.keys(comparators) as Array<keyof ControlState>;
      const lastSavedState$ = new BehaviorSubject<ControlState | undefined>(lastSavedState);
      if (apiHasSaveNotification(parentApi)) {
        subscriptions.push(
          // any time the parent saves, the current state becomes the last saved state...
          parentApi.saveNotification$.subscribe(() => {
            const controlState = {} as ControlState;
            comparatorKeys.forEach((key) => {
              const comparatorSubject = comparators[key][0]; // 0th element of tuple is the subject
              controlState[key] = comparatorSubject.value as ControlState[typeof key];
            });
            lastSavedState$.next(controlState);
          })
        );
      }

      const comparatorSubjects: Array<Observable<{ [key in keyof ControlState]: unknown }>> = [];
      for (const key of comparatorKeys) {
        const comparatorSubject = comparators[key][0]; // 0th element of tuple is the subject
        comparatorSubjects.push(
          comparatorSubject.pipe(
            map((value) => {
              return {
                [key]: value,
              };
            })
          ) as Observable<{ [key in keyof ControlState]: unknown }>
        );
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
            map((latestStates) => {
              const latestState = Object.assign({}, ...latestStates);
              return latestState;
            }),
            combineLatestWith(lastSavedState$)
          )
          .subscribe(([latestState, nextLastSavedState]) => {
            unsavedChanges.next(
              runComparators(comparators, comparatorKeys, nextLastSavedState, latestState)
            );
          })
      );
      return {
        unsavedChanges,
        resetUnsavedChanges: () => {
          const lastSaved = lastSavedState$.getValue();
          for (const key of comparatorKeys) {
            const setter = comparators[key][1]; // setter function is the 1st element of the tuple
            setter(lastSaved?.[key] as ControlState[typeof key]);
          }
        },
        cleanup: () => {
          subscriptions.forEach((subscription) => subscription.unsubscribe());
        },
      };
    },
  };
};
