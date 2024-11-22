/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataViewsContract } from '@kbn/data-views-plugin/public';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { dataViewComplexMock } from './data_view_complex';
import { dataViewWithTimefieldMock } from './data_view_with_timefield';

export const dataViewMockList = [dataViewMock, dataViewComplexMock, dataViewWithTimefieldMock];

export function createDiscoverDataViewsMock() {
  return {
    getCache: async () => {
      return [dataViewMock];
    },
    get: async (id: string) => {
      if (id === 'invalid-data-view-id') {
        return Promise.reject('Invalid');
      }
      const dataView = dataViewMockList.find((dv) => dv.id === id);
      if (dataView) {
        return Promise.resolve(dataView);
      } else {
        return Promise.reject(`DataView ${id} not found`);
      }
    },
    defaultDataViewExists: jest.fn(() => Promise.resolve(true)),
    getDefaultDataView: jest.fn(() => dataViewMock),
    updateSavedObject: jest.fn(),
    getIdsWithTitle: jest.fn(() => {
      return Promise.resolve(dataViewMockList);
    }),
    createFilter: jest.fn(),
    create: jest.fn(),
    clearInstanceCache: jest.fn(),
    getFieldsForIndexPattern: jest.fn((dataView) => dataView.fields),
    refreshFields: jest.fn(),
  } as unknown as jest.Mocked<DataViewsContract>;
}

export const dataViewsMock = createDiscoverDataViewsMock();
