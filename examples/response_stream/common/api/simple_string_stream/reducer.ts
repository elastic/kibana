/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type StreamState = string;
export type ReducerPayload = string | string[] | undefined;

export const initialState: StreamState = '';

export function simpleStringReducer(state: StreamState, payload: ReducerPayload): StreamState {
  // If the payload is undefined reset the state
  if (payload === undefined) {
    return '';
  }

  return `${state} ${Array.isArray(payload) ? payload.join() : payload}`;
}
