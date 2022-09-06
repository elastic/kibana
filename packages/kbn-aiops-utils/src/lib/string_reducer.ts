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

/**
 * The `stringReducer` is provided to handle plain string based streams with `streamFactory()`.
 *
 * @param state   - The current state, being the string fetched so far.
 * @param payload — The state update can be a plain string, an array of strings or `undefined`.
 *                  * An array of strings will be joined without a delimiter and added to the current string.
 *                    In combination with `useFetchStream`'s buffering this allows to do bulk updates
 *                    within the reducer without triggering a React/DOM update on every stream chunk.
 *                  * `undefined` can be used to reset the state to an empty string, for example, when a
 *                    UI has the option to trigger a refetch of a stream.
 *
 * @returns The updated state, a string that combines the previous string and the payload.
 */
export function stringReducer(
  state: ReducerState<StringReducer>,
  payload: ReducerAction<StringReducer>
): ReducerState<StringReducer> {
  if (payload === undefined) {
    return '';
  }

  return `${state}${Array.isArray(payload) ? payload.join('') : payload}`;
}
