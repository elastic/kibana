/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewsService } from 'src/plugins/data_views/common';

export function createIndexPatternsStartMock() {
  const dataViewsServiceFactory = jest.fn().mockResolvedValue({ get: jest.fn() });
  return {
    indexPatternsServiceFactory: dataViewsServiceFactory,
    dataViewsServiceFactory,
  };
}

export const dataViewsService = {
  find: jest.fn((search) => [{ id: search, title: search }]),
  ensureDefaultIndexPattern: jest.fn(),
  ensureDefaultDataView: jest.fn().mockReturnValue(Promise.resolve({})),
  get: jest.fn().mockReturnValue(Promise.resolve({})),
  clearCache: jest.fn(),
  createAndSave: jest.fn(),
  setDefault: jest.fn(),
  delete: jest.fn(),
  hasUserDataView: jest.fn(),
  getDefaultId: jest.fn(),
  updateSavedObject: jest.fn(),
  refreshFields: jest.fn(),
} as unknown as jest.Mocked<DataViewsService>;
