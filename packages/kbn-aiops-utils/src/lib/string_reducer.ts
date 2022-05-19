/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Reducer, ReducerAction, ReducerState } from 'react';

type StringReducerPayload = string | string[] | undefined;
export type StringReducer = Reducer<string, StringReducerPayload>;

export function stringReducer(
  state: ReducerState<StringReducer>,
  payload: ReducerAction<StringReducer>
): ReducerState<StringReducer> {
  // If the payload is undefined reset the state
  if (payload === undefined) {
    return '';
  }

  // Supporting arrays of strings allows to do bulk updates without
  // triggering DOM updates on every dispatch.
  return `${state}${Array.isArray(payload) ? payload.join('') : payload}`;
}
