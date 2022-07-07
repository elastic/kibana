/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ActionCreatorWithPayload,
  AnyAction,
  CaseReducer,
  Dispatch,
  PayloadAction,
} from '@reduxjs/toolkit';
import { PropsWithChildren } from 'react';
import { TypedUseSelectorHook } from 'react-redux';
import {
  EmbeddableInput,
  EmbeddableOutput,
  IContainer,
  IEmbeddable,
} from '@kbn/embeddable-plugin/public';

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
  input: InputType;
  output: OutputType;
  state?: StateType;
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
   * This type will be overridden to remove any and be type safe when returned by buildReduxEmbeddableContext.
   */
  [key: string]: CaseReducer<ReduxEmbeddableStateType, PayloadAction<any>>;
}

export interface ReduxEmbeddableWrapperProps<InputType extends EmbeddableInput = EmbeddableInput> {
  embeddable: IEmbeddable<InputType, EmbeddableOutput>;
  reducers: GenericEmbeddableReducers<InputType>;
  diffInput?: (a: InputType, b: InputType) => Partial<InputType>;
}

// export type ReduxEmbeddableWrapperPropsWithChildren<
//   InputType extends EmbeddableInput = EmbeddableInput
// > = PropsWithChildren<ReduxEmbeddableWrapperProps<InputType>>;

/**
 * This context type contains the actions, selector, and dispatch that embeddables need to interact with their state. This
 * should be passed down from the embeddable class, to its react components by wrapping the embeddable's render output in ReduxEmbeddableContext.
 */
export interface ReduxEmbeddableContext<
  ReduxEmbeddableStateType extends ReduxEmbeddableState = ReduxEmbeddableState,
  ReducerType extends EmbeddableReducers<ReduxEmbeddableStateType> = EmbeddableReducers<ReduxEmbeddableStateType>
> {
  actions: {
    [Property in keyof ReducerType]: ActionCreatorWithPayload<
      Parameters<ReducerType[Property]>[1]['payload']
    >;
  } & {
    // Generic reducers to interact with embeddable Input and Output.
    updateEmbeddableReduxInput: CaseReducer<
      ReduxEmbeddableStateType,
      PayloadAction<Partial<ReduxEmbeddableStateType['input']>>
    >;
    updateEmbeddableReduxOutput: CaseReducer<
      ReduxEmbeddableStateType,
      PayloadAction<Partial<ReduxEmbeddableStateType['output']>>
    >;
  };
  useEmbeddableSelector: TypedUseSelectorHook<ReduxEmbeddableStateType>;
  useEmbeddableDispatch: () => Dispatch<AnyAction>;
}

export type ReduxContainerContext<
  ReduxEmbeddableStateType extends ReduxEmbeddableState = ReduxEmbeddableState,
  ReducerType extends EmbeddableReducers<ReduxEmbeddableStateType> = EmbeddableReducers<ReduxEmbeddableStateType>
> = ReduxEmbeddableContext<ReduxEmbeddableStateType, ReducerType> & {
  containerActions: Pick<
    IContainer,
    | 'untilEmbeddableLoaded'
    | 'removeEmbeddable'
    | 'addNewEmbeddable'
    | 'updateInputForChild'
    | 'replaceEmbeddable'
  >;
};
