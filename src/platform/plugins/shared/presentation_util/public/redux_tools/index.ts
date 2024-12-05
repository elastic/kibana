/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ReduxToolsPackage } from './types';

export type { ReduxEmbeddableState, ReduxEmbeddableTools } from './redux_embeddables/types';
export { cleanFiltersForSerialize } from './redux_embeddables/clean_redux_embeddable_state';
export type { ReduxToolsPackage, ReduxTools } from './types';

export const lazyLoadReduxToolsPackage = async (): Promise<ReduxToolsPackage> => {
  const { createReduxTools } = await import('./create_redux_tools');
  const { createReduxEmbeddableTools } = await import(
    './redux_embeddables/create_redux_embeddable_tools'
  );
  return {
    createReduxTools,
    createReduxEmbeddableTools,
  };
};
