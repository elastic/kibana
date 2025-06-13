/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isString } from 'lodash';
import { AnyMachineSnapshot, StateValue } from 'xstate5';

export function matchesHistoryState<TSnapshot extends AnyMachineSnapshot>(
  state: TSnapshot,
  value: Parameters<TSnapshot['matches']>[0]
): boolean {
  if (!state.historyValue) {
    return false;
  }

  const targetKey = getTargetStateValue(value);

  // Check each history entry
  return Object.values(state.historyValue).some((historyStates) =>
    historyStates?.some((historyState) => historyState.id.includes(targetKey))
  );
}

const getTargetStateValue = (stateValue: StateValue): string => {
  if (isString(stateValue)) return stateValue;

  const keys = Object.keys(stateValue);
  if (keys.length === 0) return '';

  // Get the first key since we're assuming unique properties for nested objects
  const key = keys[0];
  const value = stateValue[key] ?? '';

  // Recursively process the value
  const nestedValue = getTargetStateValue(value);

  // Combine the current key with the nested result
  return key + (nestedValue ? '.' + nestedValue : '');
};
