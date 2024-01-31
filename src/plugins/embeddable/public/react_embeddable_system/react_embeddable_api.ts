/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { useImperativeHandle, useMemo } from 'react';
import { v4 as generateId } from 'uuid';
import { useReactEmbeddableParentContext } from './react_embeddable_parenting';
import { DefaultEmbeddableApi } from './types';

type RegisterEmbeddableApi = Omit<DefaultEmbeddableApi, 'parent'>;

/**
 * Pushes any API to the passed in ref. Note that any API passed in will not be rebuilt on
 * subsequent renders, so it does not support reactive variables. Instead, pass in setter functions
 * and publishing subjects to allow other components to listen to changes.
 */
export const useReactEmbeddableApiHandle = <
  ApiType extends DefaultEmbeddableApi = DefaultEmbeddableApi,
  RegisterApiType extends RegisterEmbeddableApi = RegisterEmbeddableApi
>(
  apiToRegister: RegisterApiType,
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

  return { thisApi, parentApi };
};

export const initializeReactEmbeddableUuid = (maybeId?: string) => maybeId ?? generateId();
