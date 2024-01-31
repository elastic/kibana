/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PresentationContainer } from '@kbn/presentation-containers';
import { createContext, useContext } from 'react';

interface ReactEmbeddableParentContext {
  parentApi?: PresentationContainer;
}

export const ReactEmbeddableParentContext = createContext<ReactEmbeddableParentContext | null>(
  null
);
export const useReactEmbeddableParentApi = (): unknown | null => {
  return useContext<ReactEmbeddableParentContext | null>(ReactEmbeddableParentContext)?.parentApi;
};

export const useReactEmbeddableParentContext = (): ReactEmbeddableParentContext | null => {
  return useContext<ReactEmbeddableParentContext | null>(ReactEmbeddableParentContext);
};
