/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewsPlugin, DataViewsContract } from '.';

export type Setup = jest.Mocked<ReturnType<DataViewsPlugin['setup']>>;
export type Start = jest.Mocked<ReturnType<DataViewsPlugin['start']>>;

const createSetupContract = (): Setup => ({});

const createStartContract = (): Start => {
  return {
    find: jest.fn((search) => [{ id: search, title: search }]),
    createField: jest.fn(() => {}),
    createFieldList: jest.fn(() => []),
    ensureDefaultIndexPattern: jest.fn(),
    ensureDefaultDataView: jest.fn().mockReturnValue(Promise.resolve({})),
    make: () => ({
      fieldsFetcher: {
        fetchForWildcard: jest.fn(),
      },
    }),
    get: jest.fn().mockReturnValue(Promise.resolve({})),
    clearCache: jest.fn(),
    getCanSaveSync: jest.fn(),
  } as unknown as jest.Mocked<DataViewsContract>;
};

export const dataViewPluginMocks = {
  createSetupContract,
  createStartContract,
};
