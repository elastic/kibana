/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EnhancedStore } from '@reduxjs/toolkit';
import { EmbeddableInput, EmbeddableOutput } from '@kbn/embeddable-plugin/public';
import { ReduxToolsReducers, ReduxToolsSelect, ReduxToolsSetters } from '../types';

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
 * The return type from createReduxEmbeddableTools. Contains tools to get state, select state for react components,
 * set state, and react to state changes.
 */
export interface ReduxEmbeddableTools<
  ReduxEmbeddableStateType extends ReduxEmbeddableState = ReduxEmbeddableState,
  ReducerType extends ReduxToolsReducers<ReduxEmbeddableStateType> = ReduxToolsReducers<ReduxEmbeddableStateType>
> {
  cleanup: () => void;
  store: EnhancedStore<ReduxEmbeddableStateType>;
  select: ReduxToolsSelect<ReduxEmbeddableStateType>;
  getState: EnhancedStore<ReduxEmbeddableStateType>['getState'];
  dispatch: ReduxToolsSetters<ReduxEmbeddableStateType, ReducerType>;
  onStateChange: EnhancedStore<ReduxEmbeddableStateType>['subscribe'];
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
