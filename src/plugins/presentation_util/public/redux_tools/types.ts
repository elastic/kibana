/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CaseReducer, PayloadAction, EnhancedStore } from '@reduxjs/toolkit';

/**
 * The Redux Tools Selector is a react redux selector function that can be used to grab values from the state, and to make a component
 * re-render when those values change.
 */
export type ReduxToolsSelect<ReduxStateType extends unknown> = <Selected extends unknown>(
  selector: (state: ReduxStateType) => Selected,
  equalityFn?: ((previous: Selected, next: Selected) => boolean) | undefined
) => Selected;

/**
 * The Redux Embeddable Setters are a collection of functions which dispatch actions to the correct store.
 */
export type ReduxToolsSetters<
  ReduxStateType extends unknown,
  ReducerType extends ReduxToolsReducers<ReduxStateType> = ReduxToolsReducers<ReduxStateType>
> = {
  [ReducerKey in keyof ReducerType]: (
    payload: Parameters<ReducerType[ReducerKey]>[1]['payload']
  ) => void;
};

/**
 * The return type from createReduxTools. Contains tools to get state, select state for react components,
 * set state, and react to state changes.
 */
export interface ReduxTools<
  ReduxStateType extends unknown,
  ReducerType extends ReduxToolsReducers<ReduxStateType> = ReduxToolsReducers<ReduxStateType>
> {
  store: EnhancedStore<ReduxStateType>;
  select: ReduxToolsSelect<ReduxStateType>;
  getState: EnhancedStore<ReduxStateType>['getState'];
  onStateChange: EnhancedStore<ReduxStateType>['subscribe'];
  dispatch: ReduxToolsSetters<ReduxStateType, ReducerType>;
}

/**
 * The Redux Tools Reducers are the shape of the Raw reducers which will be passed into createSlice. These will be used to populate the actions
 * object which the tools will return.
 */
export interface ReduxToolsReducers<ReduxStateType extends unknown> {
  /**
   * PayloadAction of type any is strategic here because we want to allow payloads of any shape in generic reducers.
   * This type will be overridden to remove any and be type safe when returned by setupReduxEmbeddable.
   */
  [key: string]: CaseReducer<ReduxStateType, PayloadAction<any>>;
}

/**
 * The package type is lazily exported from presentation_util and should contain all methods needed to use the redux embeddable tools.
 */
export interface ReduxToolsPackage {
  createReduxTools: typeof import('./create_redux_tools')['createReduxTools'];
  createReduxEmbeddableTools: typeof import('./redux_embeddables/create_redux_embeddable_tools')['createReduxEmbeddableTools'];
}
