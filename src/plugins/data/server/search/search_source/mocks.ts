/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MockedKeys } from '@kbn/utility-types/jest';
import { KibanaRequest } from '@kbn/core/server';

import { searchSourceCommonMock } from '../../../common/search/search_source/mocks';
import type { ISearchStart, ISearchSetup } from '../types';

function createSetupContract(): MockedKeys<ISearchSetup['searchSource']> {
  return {
    getAllMigrations: jest.fn(),
  };
}

function createStartContract(): MockedKeys<ISearchStart['searchSource']> {
  return {
    asScoped: async (request: jest.Mocked<KibanaRequest>) => {
      return searchSourceCommonMock;
    },
  };
}

export const searchSourceMock = {
  createSetupContract,
  createStartContract,
};
