/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apiIsPresentationContainer, PresentationContainer } from '@kbn/presentation-containers';
import { createContext, useContext, useImperativeHandle, useMemo } from 'react';
import { v4 as generateId } from 'uuid';
import { DefaultEmbeddableApi } from './types';

/**
 * Pushes any API to the passed in ref. Note that any API passed in will not be rebuilt on
 * subsequent renders, so it does not support reactive variables. Instead, pass in setter functions
 * and publishing subjects to allow other components to listen to changes.
 */
export const useReactEmbeddableApiHandle = <
  ApiType extends DefaultEmbeddableApi = DefaultEmbeddableApi
>(
  apiToRegister: Omit<ApiType, 'parent'>,
  ref: React.ForwardedRef<ApiType>,
  uuid: string
) => {
  const { parentApi } = useReactEmbeddableParentContext() ?? {};

  /**
   * Publish the api for this embeddable.
   */
  const thisApi = useMemo(
    () => {
      const api = {
        ...apiToRegister,
        uuid,

        // allow this embeddable access to its parent
        parentApi,
      } as ApiType;
      // register this api with its parent
      if (parentApi && apiIsPresentationContainer(parentApi))
        parentApi.registerPanelApi<DefaultEmbeddableApi>(uuid, api);
      return api;
    },
    // disabling exhaustive deps because the API should only be rebuilt when the uuid changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uuid]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useImperativeHandle(ref, () => thisApi, [uuid]);

  return thisApi;
};

export const initializeReactEmbeddableUuid = (maybeId?: string) => maybeId ?? generateId();

/**
 * Parenting
 */
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
