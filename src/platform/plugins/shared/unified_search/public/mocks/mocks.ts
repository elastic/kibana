/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UnifiedSearchPublicPlugin } from '../plugin';

export type Setup = jest.Mocked<ReturnType<UnifiedSearchPublicPlugin['setup']>>;
export type Start = jest.Mocked<ReturnType<UnifiedSearchPublicPlugin['start']>>;

const createSetupContract = (): Setup => {
  return {};
};

const createStartContract = (): Start => {
  return {
    ui: {
      IndexPatternSelect: jest.fn(),
      getCustomSearchBar: jest.fn(),
      SearchBar: jest.fn().mockReturnValue(null),
      AggregateQuerySearchBar: jest.fn().mockReturnValue(null),
      FiltersBuilderLazy: jest.fn(),
    },
  };
};

export const unifiedSearchPluginMock = {
  createStartContract,
  createSetupContract,
};
