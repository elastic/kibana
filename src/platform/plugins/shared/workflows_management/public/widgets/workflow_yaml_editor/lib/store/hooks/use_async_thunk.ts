/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type AsyncThunk, type AsyncThunkAction, unwrapResult } from '@reduxjs/toolkit';
import type { AsyncThunkFulfilledActionCreator } from '@reduxjs/toolkit/dist/createAsyncThunk';
import { useCallback, useReducer } from 'react';
import { useDispatch } from 'react-redux';

type AsyncThunkDispatch = <R, P, C extends {}>(
  action: AsyncThunkAction<R, P, C>
) => Promise<ReturnType<AsyncThunkFulfilledActionCreator<R, P>>>;

interface AsyncState<R> {
  result: R | undefined;
  isLoading: boolean;
  error: string | null;
}
const initialState = <R>(): AsyncState<R> => ({ result: undefined, isLoading: false, error: null });

type AsyncAction<R> =
  | { type: 'START' }
  | { type: 'SUCCESS'; payload: R }
  | { type: 'ERROR'; payload: string | null };

function asyncReducer<R>(state: AsyncState<R>, action: AsyncAction<R>): AsyncState<R> {
  switch (action.type) {
    case 'START':
      return { ...state, result: undefined, isLoading: true, error: null };
    case 'SUCCESS':
      return { ...state, result: action.payload, isLoading: false, error: null };
    case 'ERROR':
      return { ...state, isLoading: false, error: action.payload };
    default:
      return state;
  }
}

/** Generic hook to dispatch an async thunk and manage the state of the thunk execution */
export const useAsyncThunkState = <R, P, C extends {}>(
  asyncThunk: AsyncThunk<R, P, C>
): [
  start: (params: P) => Promise<void>,
  { result: R | undefined; isLoading: boolean; error: string | null }
] => {
  const dispatchAsyncThunk = useDispatch<AsyncThunkDispatch>();
  const [state, dispatch] = useReducer(asyncReducer<R>, initialState<R>());

  const start = useCallback(
    async (params: P): Promise<void> => {
      dispatch({ type: 'START' });
      try {
        const result = await dispatchAsyncThunk(asyncThunk(params));
        dispatch({ type: 'SUCCESS', payload: unwrapResult(result) });
      } catch (err) {
        dispatch({ type: 'ERROR', payload: err });
      }
    },
    [dispatchAsyncThunk, asyncThunk]
  );

  return [start, state];
};

/** Generic hook to dispatch an async thunk and return a promise of the thunk result */
export const useAsyncThunk = <R, P, C extends {}>(
  asyncThunk: AsyncThunk<R, P, C>
): ((params: P) => Promise<R | undefined>) => {
  const dispatchAsyncThunk = useDispatch<AsyncThunkDispatch>();

  const start = useCallback(
    async (params: P): Promise<R | undefined> => {
      try {
        const result = await dispatchAsyncThunk(asyncThunk(params));
        return unwrapResult(result);
      } catch (err) {
        // Error already handled and notified to the user by the thunk, just return undefined
        return undefined;
      }
    },
    [dispatchAsyncThunk, asyncThunk]
  );

  return start;
};
