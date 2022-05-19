/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  useEffect,
  useReducer,
  useRef,
  useState,
  Dispatch,
  Reducer,
  ReducerAction,
  ReducerState,
} from 'react';

import { fetchStream } from './fetch_stream';
import { stringReducer, StringReducer } from './string_reducer';

export interface UseFetchStreamCustomReducerParams {
  endpoint: string;
  body: object;
  reducer: Reducer<any, any>;
}

export interface UseFetchStreamParamsDefault {
  endpoint: string;
  body: object;
  reducer: StringReducer;
}

interface UseFetchStreamReturnType<Data, Action> {
  cancel: () => void;
  data: Data;
  dispatch: Dispatch<Action>;
  isCancelled: boolean;
  isRunning: boolean;
  start: () => Promise<void>;
}

// These overloads allow us to fall back to a simple reducer that just acts on a string as the reducer state
// if no options are supplied. Passing in options will use a custom reducer with appropriate type support.
export function useFetchStream<I extends UseFetchStreamParamsDefault, BasePath extends string>(
  endpoint: `${BasePath}${I['endpoint']}`,
  body: I['body']
): UseFetchStreamReturnType<string, ReducerAction<I['reducer']>>;

export function useFetchStream<
  I extends UseFetchStreamCustomReducerParams,
  BasePath extends string
>(
  endpoint: `${BasePath}${I['endpoint']}`,
  body: I['body'],
  options: { reducer: I['reducer']; initialState: ReducerState<I['reducer']> }
): UseFetchStreamReturnType<ReducerState<I['reducer']>, ReducerAction<I['reducer']>>;

export function useFetchStream<I extends UseFetchStreamParamsDefault, BasePath extends string>(
  endpoint: `${BasePath}${I['endpoint']}`,
  body: I['body'],
  options?: { reducer: I['reducer']; initialState: ReducerState<I['reducer']> }
): UseFetchStreamReturnType<ReducerState<I['reducer']>, ReducerAction<I['reducer']>> {
  const [isCancelled, setIsCancelled] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const reducer = (options?.reducer ?? stringReducer) as I['reducer'];
  const initialState = (options?.initialState ?? '') as ReducerState<I['reducer']>;

  const [data, dispatch] = useReducer(reducer, initialState);

  const abortCtrl = useRef(new AbortController());

  const start = async () => {
    if (isRunning) {
      throw new Error('Restart not supported yet');
    }

    setIsRunning(true);
    setIsCancelled(false);

    abortCtrl.current = new AbortController();

    for await (const actions of fetchStream<UseFetchStreamCustomReducerParams, BasePath>(
      endpoint,
      abortCtrl,
      body,
      options !== undefined
    )) {
      if (actions.length > 0) {
        dispatch(actions as ReducerAction<I['reducer']>);
      }
    }

    setIsRunning(false);
  };

  const cancel = () => {
    abortCtrl.current.abort();
    setIsCancelled(true);
    setIsRunning(false);
  };

  // If components using this custom hook get unmounted, cancel any ongoing request.
  useEffect(() => {
    return () => abortCtrl.current.abort();
  }, []);

  return {
    cancel,
    data,
    dispatch,
    isCancelled,
    isRunning,
    start,
  };
}
