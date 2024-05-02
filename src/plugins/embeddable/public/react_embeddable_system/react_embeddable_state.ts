/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  apiHasRuntimeChildState,
  apiHasSaveNotification,
  HasSerializedChildState,
} from '@kbn/presentation-containers';
import {
  getInitialValuesFromComparators,
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
import { DefaultEmbeddableApi, ReactEmbeddableFactory } from './types';

export const initializeReactEmbeddableState = async <
  SerializedState extends object = object,
  Api extends DefaultEmbeddableApi<SerializedState> = DefaultEmbeddableApi<SerializedState>,
  RuntimeState extends object = SerializedState
>(
  uuid: string,
  factory: ReactEmbeddableFactory<SerializedState, Api, RuntimeState>,
  parentApi: HasSerializedChildState<SerializedState>
) => {
  const lastSavedRuntimeState = await factory.deserializeState(
    parentApi.getSerializedStateForChild(uuid)
  );

  // If the parent provides runtime state for the child (usually as a state backup or cache),
  // we merge it with the last saved runtime state.
  const partialRuntimeState = apiHasRuntimeChildState<RuntimeState>(parentApi)
    ? parentApi.getRuntimeStateForChild(uuid) ?? ({} as Partial<RuntimeState>)
    : ({} as Partial<RuntimeState>);

  const initialRuntimeState = { ...lastSavedRuntimeState, ...partialRuntimeState };

  const startStateDiffing = (comparators: StateComparators<RuntimeState>) => {
    const subscription = new Subscription();
    const snapshotRuntimeState = () => {
      const comparatorKeys = Object.keys(comparators) as Array<keyof RuntimeState>;
      return comparatorKeys.reduce((acc, key) => {
        acc[key] = comparators[key][0].value as RuntimeState[typeof key];
        return acc;
      }, {} as RuntimeState);
    };

    // the last saved state subject is always initialized with the deserialized state from the parent.
    const lastSavedState$ = new BehaviorSubject<RuntimeState | undefined>(lastSavedRuntimeState);
    if (apiHasSaveNotification(parentApi)) {
      subscription.add(
        // any time the parent saves, the current state becomes the last saved state...
        parentApi.saveNotification$.subscribe(() => {
          lastSavedState$.next(snapshotRuntimeState());
        })
      );
    }

    const comparatorSubjects: Array<PublishingSubject<unknown>> = [];
    const comparatorKeys: Array<keyof RuntimeState> = [];
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

    subscription.add(
      combineLatest(comparatorSubjects)
        .pipe(
          debounceTime(100),
          map((latestStates) =>
            comparatorKeys.reduce((acc, key, index) => {
              acc[key] = latestStates[index] as RuntimeState[typeof key];
              return acc;
            }, {} as Partial<RuntimeState>)
          ),
          combineLatestWith(lastSavedState$)
        )
        .subscribe(([latest, last]) => {
          unsavedChanges.next(runComparators(comparators, comparatorKeys, last, latest));
        })
    );
    return {
      unsavedChanges,
      resetUnsavedChanges: () => {
        const lastSaved = lastSavedState$.getValue();
        for (const key of comparatorKeys) {
          const setter = comparators[key][1]; // setter function is the 1st element of the tuple
          setter(lastSaved?.[key] as RuntimeState[typeof key]);
        }
      },
      snapshotRuntimeState,
      cleanup: () => subscription.unsubscribe(),
    };
  };

  return { initialState: initialRuntimeState, startStateDiffing };
};
