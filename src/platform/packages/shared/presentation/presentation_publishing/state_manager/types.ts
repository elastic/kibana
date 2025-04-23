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

type SubjectsOf<T extends object> = {
  [KeyType in keyof Required<T> as `${string & KeyType}$`]: PublishingSubject<T[KeyType]>;
};

type SettersOf<T extends object> = {
  [KeyType in keyof Required<T> as `set${Capitalize<string & KeyType>}`]: (
    value: T[KeyType]
  ) => void;
};

export interface StateManager<StateType extends object> {
  getLatestState: () => StateType;
  reinitializeState: (newState?: Partial<StateType>) => void;
  api: SettersOf<StateType> & SubjectsOf<StateType>;
  anyStateChange$: Observable<void>;
}
