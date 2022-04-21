/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UnifiedSearchPublicPlugin } from './plugin';

export type Setup = jest.Mocked<ReturnType<UnifiedSearchPublicPlugin['setup']>>;
export type Start = jest.Mocked<ReturnType<UnifiedSearchPublicPlugin['start']>>;

const createStartContract = (): Start => {
  return {
    ui: {
      IndexPatternSelect: jest.fn(),
      SearchBar: jest.fn().mockReturnValue(null),
    },
  };
};

export const unifiedSearchPluginMock = {
  createStartContract,
};
