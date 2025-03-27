/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Observable } from 'rxjs';
import { PublishingSubject } from '../publishing_subject';

export type WithAllKeys<T extends object> = { [Key in keyof Required<T>]: T[Key] };

export type ComparatorFunction<StateType, KeyType extends keyof StateType> = (
  last: StateType[KeyType] | undefined,
  current: StateType[KeyType] | undefined,
  lastState?: Partial<StateType>,
  currentState?: Partial<StateType>
) => boolean;

export type StateComparators<StateType> = {
  [KeyType in keyof Required<StateType>]:
    | 'referenceEquality'
    | ComparatorFunction<StateType, KeyType>;
};

export type CustomComparators<StateType> = {
  [KeyType in keyof StateType]?: ComparatorFunction<StateType, KeyType>;
};

type SubjectsOf<T extends object> = {
  [KeyType in keyof T as `${Capitalize<string & KeyType>}$`]: PublishingSubject<T[KeyType]>;
};

type SettersOf<T extends object> = {
  [KeyType in keyof T as `set${Capitalize<string & KeyType>}`]: PublishingSubject<T[KeyType]>;
};

export interface StateManager<StateType extends object> {
  api: SettersOf<StateType> & SubjectsOf<StateType>;
  comparators: StateComparators<StateType>;
  getLatestState: () => StateType;
  reinitializeState: (newState: WithAllKeys<StateType>) => void;
  latestState$: Observable<StateType>;
}
