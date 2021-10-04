/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createContext, useContext } from 'react';
import { EmbeddableInput } from '../../../../embeddable/public';
import { GenericEmbeddableReducers, ReduxEmbeddableContextServices } from './types';

export const ReduxEmbeddableContext =
  createContext<ReduxEmbeddableContextServices<EmbeddableInput> | null>(null); // generic EmbeddableInput as placeholder

export const useReduxEmbeddableContext = <
  InputType extends EmbeddableInput = EmbeddableInput,
  ReducerType extends GenericEmbeddableReducers<InputType> = GenericEmbeddableReducers<InputType>
>() => {
  const context = useContext<ReduxEmbeddableContextServices<InputType, ReducerType>>(
    ReduxEmbeddableContext as unknown as React.Context<
      ReduxEmbeddableContextServices<InputType, ReducerType> // cast context from EmbeddableInput back to passed in generic
    >
  );

  if (context == null) {
    throw new Error(
      'useReduxEmbeddableContext must be used inside the useReduxEmbeddableContextProvider.'
    );
  }
  return context!;
};
