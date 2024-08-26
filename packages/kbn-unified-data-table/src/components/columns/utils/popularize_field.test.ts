/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Capabilities } from '@kbn/core/public';
import { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import { popularizeField } from './popularize_field';

const capabilities = {
  indexPatterns: {
    save: true,
  },
} as unknown as Capabilities;

describe('Popularize field', () => {
  test('returns undefined if data view lacks id', async () => {
    const dataView = {} as unknown as DataView;
    const fieldName = '@timestamp';
    const dataViewsService = {} as unknown as DataViewsContract;
    const result = await popularizeField(dataView, fieldName, dataViewsService, capabilities);
    expect(result).toBeUndefined();
  });

  test('returns undefined if field not found', async () => {
    const dataView = {
      fields: {
        getByName: () => {},
      },
    } as unknown as DataView;
    const fieldName = '@timestamp';
    const dataViewsService = {} as unknown as DataViewsContract;
    const result = await popularizeField(dataView, fieldName, dataViewsService, capabilities);
    expect(result).toBeUndefined();
  });

  test('do not updates saved object if data view is not persisted', async () => {
    const field = { count: 0 };
    const dataView = {
      id: 'id',
      fields: {
        getByName: () => field,
      },
      setFieldCount: jest.fn(),
      isPersisted: () => false,
    } as unknown as DataView;
    const updateSavedObjectMock = jest.fn();
    const dataViewsService = {
      updateSavedObject: updateSavedObjectMock,
    } as unknown as DataViewsContract;
    await popularizeField(dataView, '@timestamp', dataViewsService, capabilities);
    expect(updateSavedObjectMock).not.toHaveBeenCalled();
  });

  test('returns undefined if successful', async () => {
    const field = {
      count: 0,
    };
    const dataView = {
      id: 'id',
      fields: {
        getByName: () => field,
      },
      setFieldCount: jest.fn().mockImplementation((fieldName, count) => {
        field.count = count;
      }),
      isPersisted: () => true,
    } as unknown as DataView;
    const fieldName = '@timestamp';
    const updateSavedObjectMock = jest.fn();
    const dataViewsService = {
      updateSavedObject: updateSavedObjectMock,
    } as unknown as DataViewsContract;
    const result = await popularizeField(dataView, fieldName, dataViewsService, capabilities);
    expect(result).toBeUndefined();
    expect(updateSavedObjectMock).toHaveBeenCalled();
    expect(field.count).toEqual(1);
  });

  test('hides errors', async () => {
    const field = {
      count: 0,
    };
    const dataView = {
      id: 'id',
      fields: {
        getByName: () => field,
      },
      setFieldCount: jest.fn().mockImplementation((fieldName, count) => {
        field.count = count;
      }),
      isPersisted: () => true,
    } as unknown as DataView;
    const fieldName = '@timestamp';
    const dataViewsService = {
      updateSavedObject: async () => {
        throw new Error('unknown error');
      },
    } as unknown as DataViewsContract;
    const result = await popularizeField(dataView, fieldName, dataViewsService, capabilities);
    expect(result).toBeUndefined();
  });

  test('should not try to update data view without permissions', async () => {
    const field = {
      count: 0,
    };
    const dataView = {
      id: 'id',
      fields: {
        getByName: () => field,
      },
    } as unknown as DataView;
    const fieldName = '@timestamp';
    const dataViewsService = {
      updateSavedObject: jest.fn(),
    } as unknown as DataViewsContract;
    const result = await popularizeField(dataView, fieldName, dataViewsService, {
      dataViews: { save: false },
    } as unknown as Capabilities);
    expect(result).toBeUndefined();
    expect(dataViewsService.updateSavedObject).not.toHaveBeenCalled();
    expect(field.count).toEqual(0);
  });
});
