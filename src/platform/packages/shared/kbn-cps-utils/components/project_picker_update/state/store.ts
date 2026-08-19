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

export interface StoreDerivative<S, K extends keyof S> {
  /** State key this derivative owns. Reducer writes to this key are always overwritten. */
  key: K;
  /** Pure function; receives state after reducer and any prior derivatives in the array. */
  compute: (state: Readonly<S>) => S[K];
}

export interface CreateStoreProps<S, R extends ReducersMap<S>> {
  /**
   * Defines the initial state of the store.
   */
  initialState: S;
  /**
   * Defines the functions that will be used to update the state, these functions are typically invoked by user actions.
   */
  reducers: R;
  /**
   * Defines the functions that will be used to compute the state, these functions are typically invoked by the reducers as a side effect of reducer function execution.
   */
  derivatives?: Array<StoreDerivative<S, keyof S>>;
}

export const applyStoreDerivatives = <S extends object>(
  state: S,
  derivatives: Array<StoreDerivative<S, keyof S>>
): S => {
  return derivatives.reduce((acc, { key, compute }) => ({ ...acc, [key]: compute(acc) }), state);
};

export const useCreateStore = <S extends object, R extends ReducersMap<S>>({
  reducers,
  initialState,
  derivatives,
}: CreateStoreProps<S, R>) => {
  const initialStoreState = useRef<S>(initialState);

  const seededInitialState = useMemo(
    () =>
      derivatives?.length
        ? applyStoreDerivatives(initialStoreState.current, derivatives)
        : initialStoreState.current,
    [derivatives]
  );

  const combinedReducer = useMemo(() => {
    return (state: S, action: DispatchAction) => {
      const reducer = reducers[action.type];

      // Ideally we should never have an invocation that does not match a reducer
      // but in the case that we do, we return the current state without modification.
      if (!reducer) {
        return state;
      }

      const nextState = reducer(state, action.payload);
      return derivatives?.length ? applyStoreDerivatives(nextState, derivatives) : nextState;
    };
  }, [reducers, derivatives]);

  const [state, dispatch] = useReducer(combinedReducer, seededInitialState);

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
    state,
    get actions() {
      return actionsRef.current;
    },
  };
};
