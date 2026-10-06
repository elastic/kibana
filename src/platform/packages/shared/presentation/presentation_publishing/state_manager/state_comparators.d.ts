/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StateComparators } from './types';
export declare const runComparator: <StateType extends object = object>(
  comparator: StateComparators<StateType>[keyof StateType],
  lastSavedState?: Partial<StateType>,
  latestState?: Partial<StateType>,
  lastSavedValue?: StateType[keyof StateType],
  latestValue?: StateType[keyof StateType]
) => boolean;
/**
 * Run all comparators, and return an object containing only the keys that are not equal, set to the value of the latest state
 */
export declare const diffComparators: <StateType extends object = object>(
  comparators: StateComparators<StateType>,
  lastSavedState?: Partial<StateType>,
  latestState?: Partial<StateType>,
  defaultState?: Partial<StateType>
) => Partial<StateType>;
/**
 * Run comparators until at least one returns false
 */
export declare const areComparatorsEqual: <StateType extends object = object>(
  comparators: StateComparators<StateType>,
  lastSavedState?: StateType,
  currentState?: StateType,
  defaultState?: Partial<StateType>,
  getCustomLogLabel?: (key: string) => string
) => boolean;
