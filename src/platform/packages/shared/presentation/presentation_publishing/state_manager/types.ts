/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { PublishingSubject } from '../publishing_subject';
import type { SnakeToCamelCase } from '../utils/types';

export type WithAllKeys<T extends object> = { [Key in keyof Required<T>]: T[Key] };

export type ComparatorFunction<StateType, KeyType extends keyof StateType> = (
  last: StateType[KeyType] | undefined,
  current: StateType[KeyType] | undefined,
  lastState?: Partial<StateType>,
  currentState?: Partial<StateType>
) => boolean;

/**
 * A type that maps each key in a state type to a definition of how it should be compared. If a custom
 * comparator is provided, return true if the values are equal, false otherwise.
 */
export type StateComparators<StateType> = {
  [KeyType in keyof Required<StateType>]:
    | 'referenceEquality'
    | 'deepEquality'
    | 'skip'
    | ComparatorFunction<StateType, KeyType>;
};

export type CustomComparators<StateType> = {
  [KeyType in keyof StateType]?: ComparatorFunction<StateType, KeyType>;
};

export type SubjectsOf<T extends object> = {
  [KeyType in keyof Required<T> as `${SnakeToCamelCase<string & KeyType>}$`]: PublishingSubject<
    T[KeyType]
  >;
};

export type SettersOf<T extends object> = {
  [KeyType in keyof Required<T> as `set${Capitalize<SnakeToCamelCase<string & KeyType>>}`]: (
    value: T[KeyType]
  ) => void;
};

export interface StateManager<StateType extends object> {
  getLatestState: () => WithAllKeys<StateType>;
  reinitializeState: (
    newState?: Partial<StateType>,
    comparators?: StateComparators<StateType>
  ) => void;
  api: SettersOf<StateType> & SubjectsOf<StateType>;
  anyStateChange$: Observable<void>;
}
