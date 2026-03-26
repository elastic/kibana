/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { camelCase } from 'lodash';
import { BehaviorSubject, map, merge } from 'rxjs';
import { runComparator } from './state_comparators';
import type { StateComparators, StateManager, WithAllKeys } from './types';

type SubjectOf<StateType extends object> = BehaviorSubject<WithAllKeys<StateType>[keyof StateType]>;

interface UnstructuredSettersAndSubjects<StateType extends object> {
  [key: string]: SubjectOf<StateType> | ((value: StateType[keyof StateType]) => void);
}

type KeyToSubjectMap<StateType extends object> = {
  [Key in keyof StateType]?: SubjectOf<StateType>;
};

/**
 * Initializes a composable state manager instance for a given state type.
 * @param initialState - The initial state of the state manager.
 * @param defaultState - The default state of the state manager. Every key in this state must be present, for optional keys specify undefined explicly.
 * @param comparators - Optional StateComparators. When provided, subject will only emit when value changes.
 */
export const initializeStateManager = <StateType extends object>(
  initialState: Partial<StateType>,
  defaultState: WithAllKeys<StateType>,
  comparators?: StateComparators<StateType>
): StateManager<StateType> => {
  const allState = { ...defaultState, ...initialState };
  const allSubjects: Array<SubjectOf<StateType>> = [];
  const keyToSubjectMap: KeyToSubjectMap<StateType> = {};

  /**
   * Build the API for this state type. We loop through default state because it is guaranteed to
   * have all keys and we use it to build the API with a setter and a subject for each key.
   */
  const api: StateManager<StateType>['api'] = (
    Object.keys(defaultState) as Array<keyof StateType>
  ).reduce((acc, key) => {
    const subject = new BehaviorSubject(allState[key]);
    const setter = (value: StateType[typeof key]) => {
      const shouldSet = comparators
        ? !runComparator(
            comparators[key as keyof StateType],
            undefined,
            undefined,
            subject.getValue(),
            value
          ) // set only when value changes when comparators are provided
        : true; // always set when comparators are not provided
      if (shouldSet) {
        subject.next(value);
      }
    };

    const camelCaseKey = camelCase(key as string);
    const capitalizedKey = camelCaseKey.charAt(0).toUpperCase() + camelCaseKey.slice(1);
    acc[`set${capitalizedKey}`] = setter;
    acc[`${camelCaseKey as string}$`] = subject;

    allSubjects.push(subject);
    keyToSubjectMap[key] = subject;
    return acc;
  }, {} as UnstructuredSettersAndSubjects<StateType>) as StateManager<StateType>['api'];

  /**
   * Gets the latest state of this state manager.
   */
  const getLatestState: StateManager<StateType>['getLatestState'] = () => {
    return Object.keys(defaultState).reduce((acc, key) => {
      acc[key as keyof StateType] = keyToSubjectMap[key as keyof StateType]!.getValue();
      return acc;
    }, {} as StateType);
  };

  /**
   * Reinitializes the state of this state manager.
   *
   * Resets ALL keys when comparators are not provided.
   * Resets CHANGED keys when comparators are provided.
   *
   * if a key is not present in the new state, it will be set to the default value.
   */
  const reinitializeState = (newState?: Partial<StateType>) => {
    const latestState = comparators ? getLatestState() : undefined;
    for (const [key, subject] of Object.entries<SubjectOf<StateType>>(
      keyToSubjectMap as { [key: string]: SubjectOf<StateType> }
    )) {
      const shouldReset = comparators
        ? !runComparator(
            comparators[key as keyof StateType],
            latestState,
            newState,
            latestState?.[key as keyof StateType] ?? defaultState[key as keyof StateType],
            newState?.[key as keyof StateType] ?? defaultState[key as keyof StateType]
          ) // reset CHANGED keys when comparators are provided
        : true; // reset ALL keys when comparators are not provided

      if (shouldReset) {
        subject.next(newState?.[key as keyof StateType] ?? defaultState[key as keyof StateType]);
      }
    }
  };

  return {
    api,
    getLatestState,
    reinitializeState,
    anyStateChange$: merge(...allSubjects).pipe(map(() => undefined)),
  };
};
