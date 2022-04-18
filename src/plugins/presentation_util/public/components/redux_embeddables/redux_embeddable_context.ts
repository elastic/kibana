/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { createContext, useContext } from 'react';

import type { ContainerInput, EmbeddableInput } from '@kbn/embeddable-plugin/public';
import type {
  GenericEmbeddableReducers,
  ReduxContainerContextServices,
  ReduxEmbeddableContextServices,
} from './types';

/**
 * When creating the context, a generic EmbeddableInput as placeholder is used. This will later be cast to
 * the generic type passed in by the useReduxEmbeddableContext or useReduxContainerContext hooks
 **/
export const ReduxEmbeddableContext = createContext<
  | ReduxEmbeddableContextServices<EmbeddableInput>
  | ReduxContainerContextServices<EmbeddableInput>
  | null
>(null);

/**
 * A typed use context hook for embeddables that are not containers. it @returns an
 * ReduxEmbeddableContextServices object typed to the generic inputTypes and ReducerTypes you pass in.
 * Note that the reducer type is optional, but will be required to correctly infer the keys and payload
 * types of your reducers. use `typeof MyReducers` here to retain them.
 */
export const useReduxEmbeddableContext = <
  InputType extends EmbeddableInput = EmbeddableInput,
  ReducerType extends GenericEmbeddableReducers<InputType> = GenericEmbeddableReducers<InputType>
>(): ReduxEmbeddableContextServices<InputType, ReducerType> => {
  const context = useContext<ReduxEmbeddableContextServices<InputType, ReducerType>>(
    ReduxEmbeddableContext as unknown as React.Context<
      ReduxEmbeddableContextServices<InputType, ReducerType>
    >
  );
  if (context == null) {
    throw new Error(
      'useReduxEmbeddableContext must be used inside the useReduxEmbeddableContextProvider.'
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
  InputType extends ContainerInput = ContainerInput,
  ReducerType extends GenericEmbeddableReducers<InputType> = GenericEmbeddableReducers<InputType>
>(): ReduxContainerContextServices<InputType, ReducerType> => {
  const context = useContext<ReduxContainerContextServices<InputType, ReducerType>>(
    ReduxEmbeddableContext as unknown as React.Context<
      ReduxContainerContextServices<InputType, ReducerType>
    >
  );
  if (context == null) {
    throw new Error(
      'useReduxEmbeddableContext must be used inside the useReduxEmbeddableContextProvider.'
    );
  }
  return context!;
};
