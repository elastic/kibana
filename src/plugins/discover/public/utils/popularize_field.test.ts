/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Capabilities } from 'kibana/public';
import { DataView, DataViewsContract } from '../../../data_views/public';
import { popularizeField } from './popularize_field';

const capabilities = {
  indexPatterns: {
    save: true,
  },
} as unknown as Capabilities;

describe('Popularize field', () => {
  test('returns undefined if index pattern lacks id', async () => {
    const indexPattern = {} as unknown as DataView;
    const fieldName = '@timestamp';
    const dataViewsService = {} as unknown as DataViewsContract;
    const result = await popularizeField(indexPattern, fieldName, dataViewsService, capabilities);
    expect(result).toBeUndefined();
  });

  test('returns undefined if field not found', async () => {
    const indexPattern = {
      fields: {
        getByName: () => {},
      },
    } as unknown as DataView;
    const fieldName = '@timestamp';
    const dataViewsService = {} as unknown as DataViewsContract;
    const result = await popularizeField(indexPattern, fieldName, dataViewsService, capabilities);
    expect(result).toBeUndefined();
  });

  test('returns undefined if successful', async () => {
    const field = {
      count: 0,
    };
    const indexPattern = {
      id: 'id',
      fields: {
        getByName: () => field,
      },
    } as unknown as DataView;
    const fieldName = '@timestamp';
    const dataViewsService = {
      updateSavedObject: async () => {},
    } as unknown as DataViewsContract;
    const result = await popularizeField(indexPattern, fieldName, dataViewsService, capabilities);
    expect(result).toBeUndefined();
    expect(field.count).toEqual(1);
  });

  test('hides errors', async () => {
    const field = {
      count: 0,
    };
    const indexPattern = {
      id: 'id',
      fields: {
        getByName: () => field,
      },
    } as unknown as DataView;
    const fieldName = '@timestamp';
    const dataViewsService = {
      updateSavedObject: async () => {
        throw new Error('unknown error');
      },
    } as unknown as DataViewsContract;
    const result = await popularizeField(indexPattern, fieldName, dataViewsService, capabilities);
    expect(result).toBeUndefined();
  });

  test('should not try to update index pattern without permissions', async () => {
    const field = {
      count: 0,
    };
    const indexPattern = {
      id: 'id',
      fields: {
        getByName: () => field,
      },
    } as unknown as DataView;
    const fieldName = '@timestamp';
    const dataViewsService = {
      updateSavedObject: jest.fn(),
    } as unknown as DataViewsContract;
    const result = await popularizeField(indexPattern, fieldName, dataViewsService, {
      indexPatterns: { save: false },
    } as unknown as Capabilities);
    expect(result).toBeUndefined();
    expect(dataViewsService.updateSavedObject).not.toHaveBeenCalled();
    expect(field.count).toEqual(0);
  });
});
