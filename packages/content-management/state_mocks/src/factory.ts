/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContentRegistry, ContentCache } from '@kbn/content-management-state';
import { type ContentTypeFixture, types as defaultMockTypes } from './fixtures';

export const createCmState = () => {
  const registry = new ContentRegistry();
  const cache = new ContentCache(registry);

  return {
    registry,
    cache,
  };
};

export const createCmStateWithFixtures = (types: Record<string, ContentTypeFixture> = defaultMockTypes) => {
  const state = createCmState();

  for (const [, type] of Object.entries(types)) {
    state.registry.register(type.details);
  }

  return {
    ...state,
    types,
  };
};
