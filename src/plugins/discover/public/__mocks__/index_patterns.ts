/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewsContract } from '@kbn/data-views-plugin/public';
import { indexPatternMock } from './index_pattern';

export const indexPatternsMock = {
  getCache: async () => {
    return [indexPatternMock];
  },
  get: async (id: string) => {
    if (id === 'the-index-pattern-id') {
      return Promise.resolve(indexPatternMock);
    } else if (id === 'invalid-index-pattern-id') {
      return Promise.reject('Invald');
    }
  },
  updateSavedObject: jest.fn(),
} as unknown as jest.Mocked<DataViewsContract>;
