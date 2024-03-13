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
import { Api } from './types';

const factory: ReactEmbeddableFactory<
  {},
  Api
> = {
  type: 'SEARCH_REACT_EMBEDDABLE',
  deserializeState: (state) => {
    return state.rawState;
  },
  /**
   * The buildEmbeddable function is async so you can async import the component or load a saved
   * object here. The loading will be handed gracefully by the Presentation Container.
   */
  buildEmbeddable: async (state, buildApi) => {
    const { buildEmbeddable } = await import('./build_embeddable');
    return buildEmbeddable(state, buildApi);
  },
};

export const registerEmbeddableFactory = () =>
  console.log('registerReactEmbeddableFactory');
  registerReactEmbeddableFactory(factory);
