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
import { TypedUseSelectorHook } from 'react-redux';
import { EmbeddableInput, EmbeddableOutput, IEmbeddable } from '../../../../embeddable/public';

export interface GenericEmbeddableReducers<InputType> {
  /**
   * PayloadAction of type any is strategic here because we want to allow payloads of any shape in generic reducers.
   * This type will be overridden to be type safe when returned by ReduxEmbeddableContextServices
   */
  [key: string]: CaseReducer<InputType, PayloadAction<any>>;
}

export interface ReduxEmbeddableWrapperProps<InputType extends EmbeddableInput = EmbeddableInput> {
  embeddable: IEmbeddable<InputType, EmbeddableOutput>;
  reducers: GenericEmbeddableReducers<InputType>;
  diffInput?: (a: InputType, b: InputType) => Partial<InputType>;
}

/**
 * This context allows components underneath the redux embeddable wrapper to get access to the actions, selector, and dispatch.
 */
export interface ReduxEmbeddableContextServices<
  InputType extends EmbeddableInput = EmbeddableInput,
  ReducerType extends GenericEmbeddableReducers<InputType> = GenericEmbeddableReducers<InputType>
> {
  actions: {
    [Property in keyof ReducerType]: ActionCreatorWithPayload<
      Parameters<ReducerType[Property]>[1]['payload']
    >;
  } & { updateEmbeddableReduxState: ActionCreatorWithPayload<Partial<InputType>> };
  useEmbeddableSelector: TypedUseSelectorHook<InputType>;
  useEmbeddableDispatch: () => Dispatch<AnyAction>;
}
