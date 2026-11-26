/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Mocked } from 'vitest';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { dataViewComplexMock } from './data_view_complex';
import { dataViewWithTimefieldMock } from './data_view_with_timefield';

export const dataViewMockList = [dataViewMock, dataViewComplexMock, dataViewWithTimefieldMock];

export function createDataViewsMock() {
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
    getDefaultDataView: vi.fn(() => dataViewMock),
    updateSavedObject: vi.fn(),
    getIdsWithTitle: vi.fn(() => {
      return Promise.resolve(dataViewMockList);
    }),
    createFilter: vi.fn(),
    create: vi.fn(),
    clearInstanceCache: vi.fn(),
    getFieldsForIndexPattern: vi.fn((dataView) => dataView.fields),
    refreshFields: vi.fn(),
  } as unknown as Mocked<DataViewsContract>;
}

export const dataViewsMock = createDataViewsMock();
