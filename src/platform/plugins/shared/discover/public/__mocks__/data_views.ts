/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { DataView } from '@kbn/data-views-plugin/common';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { dataViewComplexMock } from './data_view_complex';
import { dataViewWithTimefieldMock } from './data_view_with_timefield';
import { createMockDataViewsService } from '@kbn/data-source/src/__mocks__/data_views_service.mock';

export const dataViewMockList = [dataViewMock, dataViewComplexMock, dataViewWithTimefieldMock];

export function createDiscoverDataViewsMock() {
  // Creates and caches by id like the real service, so the ES|QL DataView shim resolves.
  const { create, clearInstanceCache } = createMockDataViewsService();
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
    create,
    clearInstanceCache,
    getFieldsForIndexPattern: jest.fn((dataView) => dataView.fields),
    refreshFields: jest.fn(),
  } as unknown as jest.Mocked<DataViewsContract>;
}

export const dataViewsMock = createDiscoverDataViewsMock();

/** Mirrors the ID-based instance cache of DataViewsService.create, without fetching fields. */
export const createDataViewsCacheMock = () => {
  const cache = new Map<string, DataView | Promise<DataView>>();

  const create = jest.fn(async (spec: DataViewSpec) => {
    if (!spec.id) {
      return new DataView({ spec, fieldFormats: fieldFormatsMock });
    }

    const cachedDataView = cache.get(spec.id);

    if (cachedDataView) {
      return cachedDataView;
    }

    const dataView = new DataView({ spec, fieldFormats: fieldFormatsMock });
    cache.set(spec.id, dataView);

    return dataView;
  });

  const clearInstanceCache = jest.fn((id?: string) => {
    if (id) {
      cache.delete(id);

      return;
    }

    cache.clear();
  });

  return { cache, create, clearInstanceCache };
};
