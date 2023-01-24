/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  Dispatch,
  AnyAction,
  CaseReducer,
  PayloadAction,
  ActionCreatorWithPayload,
  EnhancedStore,
} from '@reduxjs/toolkit';
import { TypedUseSelectorHook } from 'react-redux';
import { EmbeddableInput, EmbeddableOutput, Embeddable } from '@kbn/embeddable-plugin/public';
import { PropsWithChildren } from 'react';

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
 * The Redux Embeddable Dispatcher is a collection of functions which dispatch actions to the correct store.
 */
export type ReduxEmbeddableDispatch<
  ReduxEmbeddableStateType extends ReduxEmbeddableState = ReduxEmbeddableState,
  ReducerType extends EmbeddableReducers<ReduxEmbeddableStateType> = EmbeddableReducers<ReduxEmbeddableStateType>
> = {
  [ReducerKey in keyof ReducerType]: (
    payload: Parameters<ReducerType[ReducerKey]>[1]['payload']
  ) => void;
};

/**
 * The return type from setupReduxEmbeddable. Contains a wrapper which comes with the store provider and provides the context to react components,
 * but also returns the context object to allow the embeddable class to interact with the redux store.
 */
export interface ReduxEmbeddableTools<
  ReduxEmbeddableStateType extends ReduxEmbeddableState = ReduxEmbeddableState,
  ReducerType extends EmbeddableReducers<ReduxEmbeddableStateType> = EmbeddableReducers<ReduxEmbeddableStateType>
> {
  cleanup: () => void;
  Wrapper: React.FC<PropsWithChildren<{}>>;
  store: EnhancedStore<ReduxEmbeddableStateType, AnyAction>;
  getState: EnhancedStore<ReduxEmbeddableStateType>['getState'];
  onStateChange: EnhancedStore<ReduxEmbeddableStateType>['subscribe'];

  // TODO remove these, as they've been eclipsed by the new dispatch and select types
  dispatch: EnhancedStore<ReduxEmbeddableStateType>['dispatch'];
  actions: ReduxEmbeddableContext<ReduxEmbeddableStateType, ReducerType>['actions'];

  // Here are the new types
  dispatchActions: ReduxEmbeddableDispatch<ReduxEmbeddableStateType, ReducerType>;
  select: ReduxEmbeddableSelect<ReduxEmbeddableStateType>;
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

/**
 * This context type contains the actions, selector, and dispatch that embeddables need to interact with their state. This
 * should be passed down from the embeddable class, to its react components by wrapping the embeddable's render output in ReduxEmbeddableContext.
 */
export interface ReduxEmbeddableContext<
  ReduxEmbeddableStateType extends ReduxEmbeddableState = ReduxEmbeddableState,
  ReducerType extends EmbeddableReducers<ReduxEmbeddableStateType> = EmbeddableReducers<ReduxEmbeddableStateType>,
  EmbeddableType extends Embeddable<
    ReduxEmbeddableStateType['explicitInput'],
    ReduxEmbeddableStateType['output']
  > = Embeddable<ReduxEmbeddableStateType['explicitInput'], ReduxEmbeddableStateType['output']>
> {
  actions: {
    [Property in keyof ReducerType]: ActionCreatorWithPayload<
      Parameters<ReducerType[Property]>[1]['payload']
    >;
  } & {
    // Generic reducers to interact with embeddable Input and Output.
    updateEmbeddableReduxInput: ActionCreatorWithPayload<
      Partial<ReduxEmbeddableStateType['explicitInput']>
    >;
    updateEmbeddableReduxOutput: ActionCreatorWithPayload<
      Partial<ReduxEmbeddableStateType['output']>
    >;
  };
  embeddableInstance: EmbeddableType;
  useEmbeddableSelector: TypedUseSelectorHook<ReduxEmbeddableStateType>;
  useEmbeddableDispatch: () => Dispatch<AnyAction>;
}
