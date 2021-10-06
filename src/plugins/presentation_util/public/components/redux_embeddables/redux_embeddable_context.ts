/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { createContext, useContext } from 'react';

import {
  GenericEmbeddableReducers,
  ReduxContainerContextServices,
  ReduxEmbeddableContextServices,
} from './types';
import { ContainerInput, EmbeddableInput } from '../../../../embeddable/public';

export const ReduxEmbeddableContext = createContext<
  | ReduxEmbeddableContextServices<EmbeddableInput>
  | ReduxContainerContextServices<EmbeddableInput>
  | null
>(null); // generic EmbeddableInput as placeholder

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
