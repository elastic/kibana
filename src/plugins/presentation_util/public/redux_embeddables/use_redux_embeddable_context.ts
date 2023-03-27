/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Embeddable } from '@kbn/embeddable-plugin/public';
import { createContext, useContext } from 'react';

import type { ReduxEmbeddableState, ReduxEmbeddableContext, EmbeddableReducers } from './types';

/**
 * When creating the context, a generic EmbeddableInput as placeholder is used. This will later be cast to
 * the type passed in by the useReduxEmbeddableContext hook
 **/
export const EmbeddableReduxContext =
  createContext<ReduxEmbeddableContext<ReduxEmbeddableState> | null>(null);

/**
 * A typed use context hook for embeddables that are not containers. it @returns an
 * ReduxEmbeddableContextServices object typed to the generic inputTypes and ReducerTypes you pass in.
 * Note that the reducer type is optional, but will be required to correctly infer the keys and payload
 * types of your reducers. use `typeof MyReducers` here to retain them.
 */
export const useReduxEmbeddableContext = <
  ReduxEmbeddableStateType extends ReduxEmbeddableState = ReduxEmbeddableState,
  ReducerType extends EmbeddableReducers<ReduxEmbeddableStateType> = EmbeddableReducers<ReduxEmbeddableStateType>,
  EmbeddableType extends Embeddable<any, any> = Embeddable<
    ReduxEmbeddableStateType['explicitInput'],
    ReduxEmbeddableStateType['output']
  >
>(): ReduxEmbeddableContext<ReduxEmbeddableStateType, ReducerType, EmbeddableType> => {
  const context = useContext<
    ReduxEmbeddableContext<ReduxEmbeddableStateType, ReducerType, EmbeddableType>
  >(
    EmbeddableReduxContext as unknown as React.Context<
      ReduxEmbeddableContext<ReduxEmbeddableStateType, ReducerType, EmbeddableType>
    >
  );
  if (context == null) {
    throw new Error(
      'useReduxEmbeddableContext must be used inside the ReduxEmbeddableWrapper from build_redux_embeddable_context.'
    );
  }

  return context!;
};
