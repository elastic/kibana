/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CaseReducer, PayloadAction, EnhancedStore } from '@reduxjs/toolkit';
import { EmbeddableInput, EmbeddableOutput } from '@kbn/embeddable-plugin/public';

export interface ReduxEmbeddableSyncSettings<
  ReduxEmbeddableStateType extends ReduxEmbeddableState = ReduxEmbeddableState
> {
  disableSync: boolean;
  isInputEqual?: (
    a: Partial<ReduxEmbeddableStateType['explicitInput']>,
    b: Partial<ReduxEmbeddableStateType['explicitInput']>
  ) => boolean;
  isOutputEqual?: (
    a: Partial<ReduxEmbeddableStateType['output']>,
    b: Partial<ReduxEmbeddableStateType['output']>
  ) => boolean;
}

/**
 * The package type is lazily exported from presentation_util and should contain all methods needed to use the redux embeddable tools.
 */
export interface ReduxEmbeddablePackage {
  createTools: typeof import('./create_redux_embeddable_tools')['createReduxEmbeddableTools'];
}

/**
 * The Redux Embeddable Selector is a react redux selector function that can be used to grab values from the state, and to make a component
 * re-render when those values change.
 */
export type ReduxEmbeddableSelect<
  ReduxEmbeddableStateType extends ReduxEmbeddableState = ReduxEmbeddableState
> = <Selected extends unknown>(
  selector: (state: ReduxEmbeddableStateType) => Selected,
  equalityFn?: ((previous: Selected, next: Selected) => boolean) | undefined
) => Selected;

/**
 * The Redux Embeddable Setters are a collection of functions which dispatch actions to the correct store.
 */
export type ReduxEmbeddableSetters<
  ReduxEmbeddableStateType extends ReduxEmbeddableState = ReduxEmbeddableState,
  ReducerType extends EmbeddableReducers<ReduxEmbeddableStateType> = EmbeddableReducers<ReduxEmbeddableStateType>
> = {
  [ReducerKey in keyof ReducerType]: (
    payload: Parameters<ReducerType[ReducerKey]>[1]['payload']
  ) => void;
};

/**
 * The return type from createReduxEmbeddableTools. Contains tools to get state, select state for react components,
 * set state, and react to state changes.
 */
export interface ReduxEmbeddableTools<
  ReduxEmbeddableStateType extends ReduxEmbeddableState = ReduxEmbeddableState,
  ReducerType extends EmbeddableReducers<ReduxEmbeddableStateType> = EmbeddableReducers<ReduxEmbeddableStateType>
> {
  cleanup: () => void;
  select: ReduxEmbeddableSelect<ReduxEmbeddableStateType>;
  getState: EnhancedStore<ReduxEmbeddableStateType>['getState'];
  onStateChange: EnhancedStore<ReduxEmbeddableStateType>['subscribe'];
  dispatch: ReduxEmbeddableSetters<ReduxEmbeddableStateType, ReducerType>;
}

/**
 * The Embeddable Redux store should contain Input, Output and State. Input is serialized and used to create the embeddable,
 * Output is used as a communication layer for state that the Embeddable creates, and State is used to store ephemeral state which needs
 * to be communicated between an embeddable and its inner React components.
 */
export interface ReduxEmbeddableState<
  InputType extends EmbeddableInput = EmbeddableInput,
  OutputType extends EmbeddableOutput = EmbeddableOutput,
  StateType extends unknown = unknown
> {
  explicitInput: InputType;
  output: OutputType;
  componentState: StateType;
}

/**
 * The Embeddable Reducers are the shape of the Raw reducers which will be passed into createSlice. These will be used to populate the actions
 * object which will be returned in the ReduxEmbeddableContext.
 */
export interface EmbeddableReducers<
  ReduxEmbeddableStateType extends ReduxEmbeddableState = ReduxEmbeddableState
> {
  /**
   * PayloadAction of type any is strategic here because we want to allow payloads of any shape in generic reducers.
   * This type will be overridden to remove any and be type safe when returned by setupReduxEmbeddable.
   */
  [key: string]: CaseReducer<ReduxEmbeddableStateType, PayloadAction<any>>;
}
