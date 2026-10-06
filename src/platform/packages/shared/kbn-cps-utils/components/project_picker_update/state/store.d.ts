/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type StoreReducer<State, Payload = void> = (state: State, payload: Payload) => State;
type ExtractPayload<T> = T extends StoreReducer<any, infer P>
  ? P extends void
    ? never
    : P
  : never;
type HasPayload<T> = T extends StoreReducer<any, void> ? false : true;
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
export declare const applyStoreDerivatives: <S extends object>(
  state: S,
  derivatives: Array<StoreDerivative<S, keyof S>>
) => S;
export declare const useCreateStore: <S extends object, R extends ReducersMap<S>>({
  reducers,
  initialState,
  derivatives,
}: CreateStoreProps<S, R>) => {
  state: S;
  readonly actions: ActionsFromReducers<R>;
};
export {};
