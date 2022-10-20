/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataView } from '@kbn/data-plugin/common';
import { AdHocDataViewsService } from './adhoc_data_views_service';

const dataViewsMap: Record<string, DataView> = {
  test1: { id: 'test1', title: 'test1', timeFieldName: 'timeField1' } as DataView,
  test2: {
    id: 'test2',
    title: 'test2',
    timeFieldName: 'timeField2',
  } as DataView,
  test3: { id: 'test3', title: 'test3', timeFieldName: 'timeField3' } as DataView,
};

const getDataview = async (id: string): Promise<DataView | undefined> => dataViewsMap[id];
const mockCreate = jest.fn();
const mockClearInstanceCache = jest.fn();

describe('AdHocDataViewsService', () => {
  let dataViews: DataViewsPublicPluginStart;
  beforeAll(() => {
    dataViews = {
      getDefault: jest.fn(async () => {
        return { id: '12345', title: 'default', timeFieldName: '@timestamp' };
      }),
      get: getDataview,
      create: mockCreate,
      clearInstanceCache: mockClearInstanceCache,
    } as unknown as DataViewsPublicPluginStart;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create adhoc dataviews', async () => {
    const id = 'some-id';
    const title = 'some-title';

    mockCreate.mockReturnValue({ id, title });
    const adHocDataViewsService = new AdHocDataViewsService(dataViews);
    const dataView1 = await adHocDataViewsService.create({ id, title });
    expect(dataView1).toBeDefined();
    expect(dataView1.id).toBe(id);
    expect(mockCreate).toBeCalledTimes(1);
  });

  test('should return adhoc dataView from cache if the one with the same timeField and title was created before', async () => {
    const id = 'some-id';
    const title = 'some-title';

    mockCreate.mockReturnValueOnce({ id, title });

    const adHocDataViewsService = new AdHocDataViewsService(dataViews);
    const dataView1 = await adHocDataViewsService.create({ id, title });
    const dataView2 = await adHocDataViewsService.create({ id, title });

    expect(dataView1).toBeDefined();
    expect(dataView1.id).toBe(id);

    expect(dataView2).toBeDefined();
    expect(dataView2.id).toBe(id);

    expect(mockCreate).toBeCalledTimes(1);
  });

  test('should return create adhoc dataView if the one with the same title but different timeField was created before', async () => {
    const id1 = 'some-id';
    const id2 = 'some-id';
    const title = 'some-title';
    const timeField1 = 'some-time-field-1';
    const timeField2 = 'some-time-field-2';

    mockCreate.mockReturnValueOnce({ id: id1, title, timeFieldName: timeField1 });
    mockCreate.mockReturnValueOnce({ id: id2, title, timeFieldName: timeField2 });

    const adHocDataViewsService = new AdHocDataViewsService(dataViews);
    const dataView1 = await adHocDataViewsService.create({
      id: id1,
      title,
      timeFieldName: timeField1,
    });
    const dataView2 = await adHocDataViewsService.create({
      id: id2,
      title,
      timeFieldName: timeField2,
    });

    expect(dataView1).toBeDefined();
    expect(dataView1.id).toBe(id1);

    expect(dataView2).toBeDefined();
    expect(dataView2.id).toBe(id2);

    expect(mockCreate).toBeCalledTimes(2);
  });

  test('should clear all adhoc dataviews from cache dataViews service cache', async () => {
    const id1 = 'some-id';
    const id2 = 'some-id';
    const title = 'some-title';
    const timeField1 = 'some-time-field-1';
    const timeField2 = 'some-time-field-2';
    const clearCacheSpy = jest.spyOn(AdHocDataViewsService.prototype as any, 'clearCache');

    mockCreate.mockReturnValueOnce({ id: id1, title, timeFieldName: timeField1 });
    mockCreate.mockReturnValueOnce({ id: id2, title, timeFieldName: timeField2 });

    const adHocDataViewsService = new AdHocDataViewsService(dataViews);
    await adHocDataViewsService.create({ id: id1, title, timeFieldName: timeField1 });
    await adHocDataViewsService.create({ id: id2, title, timeFieldName: timeField2 });

    expect(mockCreate).toBeCalledTimes(2);

    adHocDataViewsService.clearAll();
    expect(mockClearInstanceCache).toBeCalledTimes(2);
    expect(mockClearInstanceCache).toBeCalledWith(id1);
    expect(mockClearInstanceCache).toBeCalledWith(id2);
    expect(clearCacheSpy).toBeCalledTimes(1);
  });
});
