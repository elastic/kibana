/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { registerReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { SEARCH_EMBEDDABLE_ID } from './constants';
import { Services } from './types';

export function registerSearchEmbeddable(services: Services) {
  registerReactEmbeddableFactory(SEARCH_EMBEDDABLE_ID, async () => {
    const { getSearchEmbeddableFactory } = await import('./search_react_embeddable');
    return getSearchEmbeddableFactory(services);
  });
}
