/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StateComparators, StateManager, WithAllKeys } from './types';
/**
 * Initializes a composable state manager instance for a given state type.
 * @param initialState - The initial state of the state manager.
 * @param defaultState - The default state of the state manager. Every key in this state must be present, for optional keys specify undefined explicly.
 * @param comparators - Optional StateComparators. When provided, subject will only emit when value changes.
 */
export declare const initializeStateManager: <StateType extends object>(
  initialState: Partial<StateType>,
  defaultState: WithAllKeys<StateType>,
  comparators?: StateComparators<StateType>
) => StateManager<StateType>;
