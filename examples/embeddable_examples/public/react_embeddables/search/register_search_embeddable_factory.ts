/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ReactEmbeddableFactory,
  registerReactEmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import { Api, Services, State } from './types';

export const registerSearchEmbeddableFactory = (services: Services) => {
  const factory: ReactEmbeddableFactory<State, Api> = {
    type: 'SEARCH_REACT_EMBEDDABLE',
    deserializeState: (state) => {
      return state.rawState as State;
    },
    buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
      const { buildSearchEmbeddable } = await import('./build_search_embeddable');
      return buildSearchEmbeddable(state, buildApi, parentApi, services);
    },
  };

  registerReactEmbeddableFactory(factory);
};
