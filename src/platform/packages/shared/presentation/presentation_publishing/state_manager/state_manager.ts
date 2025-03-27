/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Observable, combineLatest, map, startWith } from 'rxjs';
import { CustomComparators, StateComparators, StateManager, WithAllKeys } from './types';

type SubjectOf<StateType extends object> = BehaviorSubject<WithAllKeys<StateType>[keyof StateType]>;

interface UnstructuredSettersAndSubjects<StateType extends object> {
  [key: string]: SubjectOf<StateType> | ((value: StateType[keyof StateType]) => void);
}

type KeyToSubjectMap<StateType extends object> = {
  [Key in keyof StateType]?: SubjectOf<StateType>;
};

export const initializeStateManager = <StateType extends object>(
  initialState: StateType,
  defaultState: WithAllKeys<StateType>,
  customComparators: CustomComparators<StateType>
): StateManager<StateType> => {
  const allState = { ...defaultState, ...initialState };
  const allSubjects: Array<SubjectOf<StateType>> = [];
  const keyToSubjectMap: KeyToSubjectMap<StateType> = {};

  /**
   * Set up comparators for each key in the state. We loop through default state because it is
   * guaranteed to have all keys and if a custom comparator is not provided for a key, we default
   * to reference equality.
   */
  const comparators: StateManager<StateType>['comparators'] = (
    Object.keys(defaultState) as Array<keyof StateType>
  ).reduce((acc, key) => {
    const comparator = customComparators[key];
    acc[key] = comparator ?? 'referenceEquality';
    return acc;
  }, {} as StateComparators<StateType>);

  /**
   * Build the API for this state type. We loop through default state because it is guaranteed to
   * have all keys and we use it to build the API with a setter and a subject for each key.
   */
  const api: StateManager<StateType>['api'] = (
    Object.keys(defaultState) as Array<keyof StateType>
  ).reduce((acc, key) => {
    const subject = new BehaviorSubject(allState[key]);
    const setter = (value: StateType[typeof key]) => subject.next(value);

    const capitalizedKey = (key as string).charAt(0).toUpperCase() + (key as string).slice(1);
    acc[`set${capitalizedKey}`] = setter;
    acc[`${capitalizedKey}$`] = subject;

    allSubjects.push(subject);
    keyToSubjectMap[key] = subject;
    return acc;
  }, {} as UnstructuredSettersAndSubjects<StateType>) as StateManager<StateType>['api'];

  /**
   * Gets the latest state of this state manager.
   */
  const getLatestState: StateManager<StateType>['getLatestState'] = () =>
    allSubjects.map((subject) => subject.getValue()) as StateType;

  /**
   * Reinitializes the state of this state manager. All keys are required in the new state to ensure that every subject is overwritten.
   */
  const reinitializeState = (newState: WithAllKeys<StateType>) => {
    for (const [key, subject] of Object.entries<SubjectOf<StateType>>(
      keyToSubjectMap as { [key: string]: SubjectOf<StateType> }
    )) {
      subject.next(newState[key as keyof StateType]);
    }
  };

  const latestState$: Observable<StateType> = combineLatest(allSubjects).pipe(
    startWith(allState),
    map(() => getLatestState())
  );

  return {
    api,
    comparators,
    getLatestState,
    reinitializeState,
    latestState$,
  };
};
