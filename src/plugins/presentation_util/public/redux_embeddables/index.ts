/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReduxEmbeddablePackage } from './types';

export { useReduxEmbeddableContext } from './use_redux_embeddable_context';

export type { ReduxEmbeddableState, ReduxEmbeddableTools, ReduxEmbeddablePackage } from './types';
export { cleanFiltersForSerialize } from './clean_redux_embeddable_state';

export const lazyLoadReduxEmbeddablePackage = async (): Promise<ReduxEmbeddablePackage> => {
  const { createReduxEmbeddableTools } = await import('./create_redux_embeddable_tools');
  return {
    createTools: createReduxEmbeddableTools,
  };
};
