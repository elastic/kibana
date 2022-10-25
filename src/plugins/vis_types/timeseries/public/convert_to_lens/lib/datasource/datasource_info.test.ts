/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataView } from '@kbn/data-plugin/common';
import { extractOrGenerateDatasourceInfo } from './datasource_info';
import { mockAdHocDataViewsService } from '../__mocks__';

const dataViewsMap: Record<string, DataView> = {
  test1: { id: 'test1', title: 'test1', timeFieldName: 'timeField1' } as DataView,
  test2: {
    id: 'test2',
    title: 'test2',
    timeFieldName: 'timeField2',
  } as DataView,
  test3: {
    id: 'test3',
    title: 'test3',
    timeFieldName: 'timeField3',
    name: 'index-pattern-3',
  } as DataView,
};

const mockFetchIndexPattern = jest.fn();

jest.mock('../../../../common/index_patterns_utils', () => {
  const originalModule = jest.requireActual('../../../../common/index_patterns_utils');
  return {
    fetchIndexPattern: jest.fn(() => mockFetchIndexPattern()),
    isStringTypeIndexPattern: originalModule.isStringTypeIndexPattern,
  };
});

jest.mock('./adhoc_data_views_service', () => ({
  AdHocDataViewsService: jest.fn(() => mockAdHocDataViewsService),
}));

const getDataview = async (id: string): Promise<DataView | undefined> => dataViewsMap[id];

describe('extractOrGenerateDatasourceInfo', () => {
  let dataViews: DataViewsPublicPluginStart;
  beforeAll(() => {
    dataViews = {
      getDefault: jest.fn(async () => {
        return { id: '12345', title: 'default', timeFieldName: '@timestamp' };
      }),
      get: getDataview,
      create: () => getDataview('test3'),
    } as unknown as DataViewsPublicPluginStart;
    (mockAdHocDataViewsService.create as jest.Mock).mockReturnValue(dataViewsMap.test3);
  });

  beforeEach(() => {
    mockFetchIndexPattern.mockReturnValue({
      indexPattern: undefined,
      indexPatternString: '',
    });
    jest.clearAllMocks();
  });

  test('should return ad-hoc dataview if model_indexpattern is string and no corresponding dataview found by string', async () => {
    const timeFieldName = 'timeField-3';
    const datasourceInfo = await extractOrGenerateDatasourceInfo(
      'test',
      timeFieldName,
      false,
      undefined,
      undefined,
      dataViews,
      mockAdHocDataViewsService
    );
    const { indexPatternId, timeField, indexPattern } = datasourceInfo!;
    expect(indexPatternId).toBe(dataViewsMap.test3.id);
    expect(timeField).toBe(timeFieldName);
    expect(indexPattern).toBe(dataViewsMap.test3);
    expect(mockAdHocDataViewsService.create).toBeCalledTimes(1);
    expect(mockAdHocDataViewsService.clearAll).toBeCalledTimes(0);
  });

  test('should return dataview if model_indexpattern is string and corresponding dataview is found by string', async () => {
    mockFetchIndexPattern.mockReturnValueOnce({
      indexPattern: dataViewsMap.test3,
      indexPatternString: dataViewsMap.test3.name,
    });

    const timeFieldName = 'timeField-3';
    const datasourceInfo = await extractOrGenerateDatasourceInfo(
      dataViewsMap.test3.name,
      timeFieldName,
      false,
      undefined,
      undefined,
      dataViews,
      mockAdHocDataViewsService
    );
    const { indexPatternId, timeField, indexPattern } = datasourceInfo!;
    expect(indexPatternId).toBe(dataViewsMap.test3.id);
    expect(timeField).toBe(dataViewsMap.test3.timeFieldName);
    expect(indexPattern).toBe(dataViewsMap.test3);
    expect(mockAdHocDataViewsService.create).toBeCalledTimes(0);
    expect(mockAdHocDataViewsService.clearAll).toBeCalledTimes(0);
  });

  test('should return the correct dataview if model_indexpattern is object', async () => {
    const datasourceInfo = await extractOrGenerateDatasourceInfo(
      { id: 'dataview-1-id' },
      'timeField-1',
      false,
      undefined,
      undefined,
      dataViews,
      mockAdHocDataViewsService
    );
    const { indexPatternId, timeField } = datasourceInfo!;

    expect(indexPatternId).toBe('dataview-1-id');
    expect(timeField).toBe('timeField-1');
    expect(mockAdHocDataViewsService.create).toBeCalledTimes(0);
    expect(mockAdHocDataViewsService.clearAll).toBeCalledTimes(0);
  });

  test('should fetch the correct data if overwritten dataview is provided', async () => {
    mockFetchIndexPattern.mockReturnValueOnce({
      indexPattern: dataViewsMap.test2,
      indexPatternString: dataViewsMap.test2.name,
    });
    const datasourceInfo = await extractOrGenerateDatasourceInfo(
      { id: 'dataview-1-id' },
      'timeField-1',
      true,
      { id: 'test2' },
      undefined,
      dataViews,
      mockAdHocDataViewsService
    );
    const { indexPatternId, timeField } = datasourceInfo!;

    expect(indexPatternId).toBe('test2');
    expect(timeField).toBe(dataViewsMap.test2.timeFieldName);
    expect(mockFetchIndexPattern).toBeCalledTimes(1);
    expect(mockAdHocDataViewsService.create).toBeCalledTimes(0);
    expect(mockAdHocDataViewsService.clearAll).toBeCalledTimes(0);
  });

  test('should return the correct dataview if overwritten dataview is string', async () => {
    (mockAdHocDataViewsService.create as jest.Mock).mockReturnValue(dataViewsMap.test2);

    const datasourceInfo = await extractOrGenerateDatasourceInfo(
      { id: 'dataview-1-id' },
      'timeField-1',
      true,
      'test2',
      undefined,
      dataViews,
      mockAdHocDataViewsService
    );
    const { indexPatternId, timeField } = datasourceInfo!;

    expect(indexPatternId).toBe('test2');
    expect(timeField).toBe('timeField2');
    expect(mockAdHocDataViewsService.create).toBeCalledTimes(1);
    expect(mockAdHocDataViewsService.clearAll).toBeCalledTimes(0);
  });

  test('should return null if dataview is string and invalid', async () => {
    (mockAdHocDataViewsService.create as jest.Mock).mockImplementationOnce(() => {
      throw new Error();
    });

    const datasourceInfo = await extractOrGenerateDatasourceInfo(
      'dataview-1-i',
      'timeField-1',
      false,
      undefined,
      undefined,
      dataViews,
      mockAdHocDataViewsService
    );

    expect(datasourceInfo).toBeNull();
    expect(mockAdHocDataViewsService.create).toBeCalledTimes(1);
    expect(mockAdHocDataViewsService.clearAll).toBeCalledTimes(1);
  });

  test('should return null if overritten dataview is string and invalid', async () => {
    (mockAdHocDataViewsService.create as jest.Mock).mockImplementationOnce(() => {
      throw new Error();
    });

    const datasourceInfo = await extractOrGenerateDatasourceInfo(
      { id: 'dataview-1-id' },
      'timeField-1',
      true,
      'test',
      undefined,
      dataViews,
      mockAdHocDataViewsService
    );

    expect(datasourceInfo).toBeNull();
    expect(mockAdHocDataViewsService.create).toBeCalledTimes(1);
    expect(mockAdHocDataViewsService.clearAll).toBeCalledTimes(1);
  });
});
