/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  apiProvidesUnsavedState,
  apiPublishesLastSavedState,
  getLastSavedStateSubjectForChild,
  SerializedPanelState,
} from '@kbn/presentation-containers';
import {
  getInitialValuesFromComparators,
  PublishingSubject,
  runComparators,
  StateComparators,
} from '@kbn/presentation-publishing';
import { BehaviorSubject, combineLatest, combineLatestWith, debounceTime, map } from 'rxjs';
import { DefaultEmbeddableApi, ReactEmbeddableFactory } from './types';

const combineStates = <StateType extends object = object>(
  base: SerializedPanelState<StateType> | undefined,
  override: SerializedPanelState<StateType> | undefined
): SerializedPanelState<StateType> => {
  return {
    references: [...(base?.references ?? []), ...(override?.references ?? [])],
    rawState: {
      ...(base?.rawState ?? ({} as StateType)),
      ...(override?.rawState ?? ({} as StateType)),
    },
    version: override?.version ?? base?.version,
  };
};

const getDefaultDiffingApi = () => {
  return {
    unsavedChanges: new BehaviorSubject<object | undefined>(undefined),
    resetUnsavedChanges: () => {},
    cleanup: () => {},
  };
};

export const initializeReactEmbeddableState = async <
  StateType extends object = object,
  ApiType extends DefaultEmbeddableApi<StateType> = DefaultEmbeddableApi<StateType>
>(
  uuid: string,
  factory: ReactEmbeddableFactory<StateType, ApiType>,
  parentApi: unknown
) => {
  const lastSavedParentState = apiPublishesLastSavedState(parentApi)
    ? parentApi?.getLastSavedStateForChild(uuid)
    : undefined;
  const latestParentState = apiProvidesUnsavedState(parentApi)
    ? combineStates(lastSavedParentState, parentApi.getUnsavedStateForChild(uuid))
    : lastSavedParentState;

  const loadedState = factory.load ? await factory.load(latestParentState) : undefined;

  const initialState = factory.deserializeState(combineStates(loadedState, latestParentState));

  const startStateDiffing = (comparators: StateComparators<StateType>) => {
    if (Object.keys(comparators).length === 0) return getDefaultDiffingApi();

    const lastSavedStateSubject = getLastSavedStateSubjectForChild<StateType>(
      parentApi,
      uuid,
      (state) => {
        // deserializer includes loaded state to ensure by reference panels are fully compared.
        return factory.deserializeState(combineStates(loadedState, state));
      }
    );
    if (!lastSavedStateSubject) return getDefaultDiffingApi();

    const comparatorSubjects: Array<PublishingSubject<unknown>> = [];
    const comparatorKeys: Array<keyof StateType> = [];
    for (const key of Object.keys(comparators) as Array<keyof StateType>) {
      const comparatorSubject = comparators[key][0]; // 0th element of tuple is the subject
      comparatorSubjects.push(comparatorSubject as PublishingSubject<unknown>);
      comparatorKeys.push(key);
    }

    const unsavedChanges = new BehaviorSubject<Partial<StateType> | undefined>(
      runComparators(
        comparators,
        comparatorKeys,
        lastSavedStateSubject?.getValue(),
        getInitialValuesFromComparators(comparators, comparatorKeys)
      )
    );

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
    return {
      unsavedChanges,
      resetUnsavedChanges: () => {
        const lastSaved = lastSavedStateSubject?.getValue();
        for (const key of comparatorKeys) {
          const setter = comparators[key][1]; // setter function is the 1st element of the tuple
          setter(lastSaved?.[key] as StateType[typeof key]);
        }
      },
      cleanup: () => subscription.unsubscribe(),
    };
  };

  return { initialState, startStateDiffing };
};
