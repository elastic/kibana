/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataView } from '@kbn/data-plugin/common';
import { getDataSourceInfo } from './get_datasource_info';

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

describe('getDataSourceInfo', () => {
  let dataViews: DataViewsPublicPluginStart;
  beforeAll(() => {
    dataViews = {
      getDefault: jest.fn(async () => {
        return { id: '12345', title: 'default', timeFieldName: '@timestamp' };
      }),
      get: getDataview,
      create: () => getDataview('test3'),
    } as unknown as DataViewsPublicPluginStart;
  });

  test('should return ad-hoc dataview if model_indexpattern is string', async () => {
    const timeFieldName = 'timeField-3';
    const datasourceInfo = await getDataSourceInfo(
      'test',
      timeFieldName,
      false,
      undefined,
      undefined,
      dataViews
    );
    const { indexPatternId, timeField, indexPattern } = datasourceInfo!;
    expect(indexPatternId).toBe(dataViewsMap.test3.id);
    expect(timeField).toBe(timeFieldName);
    expect(indexPattern).toBe(dataViewsMap.test3);
  });

  test('should return the correct dataview if model_indexpattern is object', async () => {
    const datasourceInfo = await getDataSourceInfo(
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
    const datasourceInfo = await getDataSourceInfo(
      { id: 'dataview-1-id' },
      'timeField-1',
      true,
      { id: 'test2' },
      undefined,
      dataViews
    );
    const { indexPatternId, timeField } = datasourceInfo!;

    expect(indexPatternId).toBe('test2');
    expect(timeField).toBe('timeField2');
  });
});
