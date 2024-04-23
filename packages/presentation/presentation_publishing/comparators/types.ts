/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublishingSubject } from '../publishing_subject';

export type ComparatorFunction<StateType, KeyType extends keyof StateType> = (
  last: StateType[KeyType] | undefined,
  current: StateType[KeyType] | undefined,
  lastState?: Partial<StateType>,
  currentState?: Partial<StateType>
) => boolean;

export type ComparatorDefinition<StateType, KeyType extends keyof StateType> = [
  PublishingSubject<StateType[KeyType]>,
  (value: StateType[KeyType]) => void,
  ComparatorFunction<StateType, KeyType>?
];

export type StateComparators<StateType> = {
  [KeyType in keyof StateType]: ComparatorDefinition<StateType, KeyType>;
};
