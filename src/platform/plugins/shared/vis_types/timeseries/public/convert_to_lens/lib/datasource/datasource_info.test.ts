/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataView } from '@kbn/data-plugin/common';
import { extractOrGenerateDatasourceInfo } from './datasource_info';

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

const mockCreateDataView = jest.fn();

jest.mock('../../../../common/index_patterns_utils', () => {
  const originalModule = jest.requireActual('../../../../common/index_patterns_utils');
  return {
    isStringTypeIndexPattern: originalModule.isStringTypeIndexPattern,
  };
});

const getDataview = async (id: string): Promise<DataView | undefined> => dataViewsMap[id];

describe('extractOrGenerateDatasourceInfo', () => {
  let dataViews: DataViewsPublicPluginStart;
  beforeAll(() => {
    dataViews = {
      getDefault: jest.fn(async () => {
        return { id: '12345', title: 'default', timeFieldName: '@timestamp' };
      }),
      get: getDataview,
      create: mockCreateDataView,
    } as unknown as DataViewsPublicPluginStart;
  });

  beforeEach(() => {
    mockCreateDataView.mockReturnValue(getDataview('test3'));
  });

  afterEach(() => {
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
      dataViews
    );
    const { indexPatternId, timeField, indexPattern } = datasourceInfo!;
    expect(indexPatternId).toBe(dataViewsMap.test3.id);
    expect(timeField).toBe(dataViewsMap.test3.timeFieldName);
    expect(indexPattern).toBe(dataViewsMap.test3);
  });

  test('should return dataview if model_indexpattern is string and corresponding dataview is found by string', async () => {
    const timeFieldName = 'timeField-3';
    const datasourceInfo = await extractOrGenerateDatasourceInfo(
      dataViewsMap.test3.name,
      timeFieldName,
      false,
      undefined,
      undefined,
      dataViews
    );
    const { indexPatternId, timeField, indexPattern } = datasourceInfo!;
    expect(indexPatternId).toBe(dataViewsMap.test3.id);
    expect(timeField).toBe(dataViewsMap.test3.timeFieldName);
    expect(indexPattern).toBe(dataViewsMap.test3);
  });

  test('should return the correct dataview if model_indexpattern is object', async () => {
    const datasourceInfo = await extractOrGenerateDatasourceInfo(
      { id: 'dataview-1-id' },
      'timeField-1',
      false,
      undefined,
      undefined,
      dataViews
    );
    const { indexPatternId, timeField } = datasourceInfo!;

    expect(indexPatternId).toBe('dataview-1-id');
    expect(timeField).toBe('timeField-1');
  });

  test('should fetch the correct data if overwritten dataview is provided', async () => {
    const datasourceInfo = await extractOrGenerateDatasourceInfo(
      { id: 'dataview-1-id' },
      'timeField-1',
      true,
      { id: 'test2' },
      undefined,
      dataViews
    );
    const { indexPatternId, timeField } = datasourceInfo!;

    expect(indexPatternId).toBe('test2');
    expect(timeField).toBe(dataViewsMap.test2.timeFieldName);
  });

  test('should return the correct dataview if overwritten dataview is string', async () => {
    mockCreateDataView.mockReturnValue(dataViewsMap.test2);

    const datasourceInfo = await extractOrGenerateDatasourceInfo(
      { id: 'dataview-1-id' },
      'timeField-1',
      true,
      'test2',
      undefined,
      dataViews
    );
    const { indexPatternId, timeField } = datasourceInfo!;

    expect(indexPatternId).toBe('test2');
    expect(timeField).toBe('timeField2');
  });

  test('should return null if dataview is string and invalid', async () => {
    mockCreateDataView.mockImplementationOnce(() => {
      throw new Error();
    });

    const datasourceInfo = await extractOrGenerateDatasourceInfo(
      'dataview-1-i',
      'timeField-1',
      false,
      undefined,
      undefined,
      dataViews
    );

    expect(datasourceInfo).toBeNull();
  });

  test('should return null if overritten dataview is string and invalid', async () => {
    mockCreateDataView.mockImplementationOnce(() => {
      throw new Error();
    });

    const datasourceInfo = await extractOrGenerateDatasourceInfo(
      { id: 'dataview-1-id' },
      'timeField-1',
      true,
      'test',
      undefined,
      dataViews
    );

    expect(datasourceInfo).toBeNull();
  });
});
