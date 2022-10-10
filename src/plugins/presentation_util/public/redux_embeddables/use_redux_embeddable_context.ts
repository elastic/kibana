/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { createContext, useContext } from 'react';

import type {
  ReduxEmbeddableState,
  ReduxContainerContext,
  ReduxEmbeddableContext,
  EmbeddableReducers,
} from './types';

/**
 * When creating the context, a generic EmbeddableInput as placeholder is used. This will later be cast to
 * the type passed in by the useReduxEmbeddableContext or useReduxContainerContext hooks
 **/
export const EmbeddableReduxContext = createContext<
  ReduxEmbeddableContext<ReduxEmbeddableState> | ReduxContainerContext<ReduxEmbeddableState> | null
>(null);

/**
 * A typed use context hook for embeddables that are not containers. it @returns an
 * ReduxEmbeddableContextServices object typed to the generic inputTypes and ReducerTypes you pass in.
 * Note that the reducer type is optional, but will be required to correctly infer the keys and payload
 * types of your reducers. use `typeof MyReducers` here to retain them.
 */
export const useReduxEmbeddableContext = <
  ReduxEmbeddableStateType extends ReduxEmbeddableState = ReduxEmbeddableState,
  ReducerType extends EmbeddableReducers<ReduxEmbeddableStateType> = EmbeddableReducers<ReduxEmbeddableStateType>
>(): ReduxEmbeddableContext<ReduxEmbeddableStateType, ReducerType> => {
  const context = useContext<ReduxEmbeddableContext<ReduxEmbeddableStateType, ReducerType>>(
    EmbeddableReduxContext as unknown as React.Context<
      ReduxEmbeddableContext<ReduxEmbeddableStateType, ReducerType>
    >
  );
  if (context == null) {
    throw new Error(
      'useReduxEmbeddableContext must be used inside the ReduxEmbeddableWrapper from build_redux_embeddable_context.'
    );
  }

  return context!;
};

/**
 * A typed use context hook for embeddable containers. it @returns an
 * ReduxContainerContextServices object typed to the generic inputTypes and ReducerTypes you pass in.
 * Note that the reducer type is optional, but will be required to correctly infer the keys and payload
 * types of your reducers. use `typeof MyReducers` here to retain them. It also includes a containerActions
 * key which contains most of the commonly used container operations
 */
export const useReduxContainerContext = <
  ReduxEmbeddableStateType extends ReduxEmbeddableState = ReduxEmbeddableState,
  ReducerType extends EmbeddableReducers<ReduxEmbeddableStateType> = EmbeddableReducers<ReduxEmbeddableStateType>
>(): ReduxContainerContext<ReduxEmbeddableStateType, ReducerType> => {
  const context = useContext<ReduxContainerContext<ReduxEmbeddableStateType, ReducerType>>(
    EmbeddableReduxContext as unknown as React.Context<
      ReduxContainerContext<ReduxEmbeddableStateType, ReducerType>
    >
  );
  if (context == null) {
    throw new Error(
      'useReduxEmbeddableContext must be used inside the ReduxEmbeddableWrapper from build_redux_embeddable_context.'
    );
  }
  return context!;
};
