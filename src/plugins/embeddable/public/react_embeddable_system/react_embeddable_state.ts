/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getLastSavedStateSubjectForChild,
  HasChildState,
  SerializedPanelState,
} from '@kbn/presentation-containers';
import {
  getInitialValuesFromComparators,
  PublishingSubject,
  runComparators,
  StateComparators,
} from '@kbn/presentation-publishing';
import { BehaviorSubject, combineLatest, combineLatestWith, debounceTime, map } from 'rxjs';
import { AnyReactEmbeddableFactory } from './types';

const getDefaultDiffingApi = () => {
  return {
    unsavedChanges: new BehaviorSubject<object | undefined>(undefined),
    resetUnsavedChanges: () => {},
    cleanup: () => {},
  };
};

export const initializeReactEmbeddableState = async <
  SerializedState extends object,
  RuntimeState extends object,
  ExternalState extends object
>(
  uuid: string,
  factory: AnyReactEmbeddableFactory,
  parentApi: HasChildState
) => {
  const latestParentState = parentApi.getStateForChild(uuid);

  const firstLoadedExternalState: SerializedPanelState<ExternalState> | undefined =
    factory.loadExternalState ? await factory.loadExternalState(latestParentState) : undefined;

  const initialRuntimeState: RuntimeState = factory.deserializeState(
    latestParentState,
    firstLoadedExternalState
  );

  const startStateDiffing = (comparators: StateComparators<RuntimeState>) => {
    if (Object.keys(comparators).length === 0) return getDefaultDiffingApi();

    const lastSavedStateSubject = getLastSavedStateSubjectForChild<SerializedState, RuntimeState>(
      parentApi,
      uuid,
      (state) => {
        if (!state) return;
        // when deserializing last saved state, we always use the external state that was loaded
        // on initiailization to avoid loading it multiple times.
        return factory.deserializeState(state, firstLoadedExternalState);
      }
    );
    if (!lastSavedStateSubject) return getDefaultDiffingApi();

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
        lastSavedStateSubject?.getValue() as RuntimeState,
        getInitialValuesFromComparators(comparators, comparatorKeys)
      )
    );

    const subscription = combineLatest(comparatorSubjects)
      .pipe(
        debounceTime(100),
        map((latestStates) =>
          comparatorKeys.reduce((acc, key, index) => {
            acc[key] = latestStates[index] as RuntimeState[typeof key];
            return acc;
          }, {} as Partial<RuntimeState>)
        ),
        combineLatestWith(lastSavedStateSubject)
      )
      .subscribe(([latestStates, lastSavedState]) => {
        unsavedChanges.next(
          runComparators(comparators, comparatorKeys, lastSavedState, latestStates)
        );
      });
    return {
      unsavedChanges,
      resetUnsavedChanges: () => {
        const lastSaved = lastSavedStateSubject?.getValue();
        for (const key of comparatorKeys) {
          const setter = comparators[key][1]; // setter function is the 1st element of the tuple
          setter(lastSaved?.[key] as RuntimeState[typeof key]);
        }
      },
      cleanup: () => subscription.unsubscribe(),
    };
  };

  return { initialState: initialRuntimeState, startStateDiffing };
};
