/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useRef, useMemo, useReducer, useCallback } from 'react';

interface DispatchAction<P = unknown> {
  type: string;
  payload: P;
}

export type StoreReducer<State, Payload = void> = (state: State, payload: Payload) => State;

// Helper type to extract payload type from a reducer
type ExtractPayload<T> = T extends StoreReducer<any, infer P>
  ? P extends void
    ? never
    : P
  : never;

// Check if a reducer expects a payload
type HasPayload<T> = T extends StoreReducer<any, void> ? false : true;

// Type for action creators derived from reducers
export type ActionsFromReducers<T extends ReducersMap<any>> = {
  [K in keyof T]: HasPayload<T[K]> extends false
    ? () => void
    : (payload: ExtractPayload<T[K]>) => void;
};

export interface ReducersMap<State> {
  [K: string]: StoreReducer<State, any>;
}

export interface CreateStoreProps<State, Reducers extends ReducersMap<State>> {
  initialState: State;
  reducers: Reducers;
}

export const useCreateStore = <S extends Record<string, unknown>, R extends ReducersMap<S>>({
  reducers,
  initialState,
}: CreateStoreProps<S, R>) => {
  const initialStoreState = useRef<S>(initialState);

  const combinedReducer = useMemo(() => {
    return (state: S, action: DispatchAction) => {
      const reducer = reducers[action.type];

      // Ideally we should never have an invocation that does not match a reducer
      // but in the case that we do, we return the current state without modification.
      if (!reducer) {
        return state;
      }

      return reducer(state, action.payload);
    };
  }, [reducers]);

  const [state, dispatch] = useReducer(combinedReducer, initialStoreState.current);

  const createActions = useCallback(() => {
    return Object.keys(reducers).reduce((acc, key) => {
      const typedKey = key as keyof R;
      acc[typedKey] = ((payload?: unknown) => {
        dispatch({ type: key, payload });
      }) satisfies ActionsFromReducers<R>[keyof R];
      return acc;
    }, {} as ActionsFromReducers<R>);
  }, [reducers, dispatch]);

  // stable reference for store actions
  const actionsRef = useRef(createActions());

  return {
    get state() {
      return state;
    },
    get actions() {
      return actionsRef.current;
    },
  };
};
