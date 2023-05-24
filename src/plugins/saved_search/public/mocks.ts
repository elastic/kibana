/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { searchSourceInstanceMock } from '@kbn/data-plugin/common/search/search_source/mocks';

const savedSearchStartMock = () => ({
  get: jest.fn().mockImplementation(() => ({
    id: 'savedSearch',
    title: 'savedSearchTitle',
    searchSource: searchSourceInstanceMock,
  })),
  getAll: jest.fn(),
  getNew: jest.fn().mockImplementation(() => ({
    searchSource: searchSourceInstanceMock,
  })),
  save: jest.fn(),
  find: jest.fn(),
});

export const savedSearchPluginMock = {
  createStartContract: savedSearchStartMock,
};
