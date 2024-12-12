/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { waitFor, renderHook } from '@testing-library/react';
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { createStubDataView, stubFieldSpecMap } from '@kbn/data-plugin/public/stubs';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { UI_SETTINGS } from '@kbn/data-service/src/constants';
import {
  useExistingFieldsFetcher,
  useExistingFieldsReader,
  resetExistingFieldsCache,
  type ExistingFieldsFetcherParams,
  ExistingFieldsReader,
} from './use_existing_fields';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import * as ExistingFieldsServiceApi from '../services/field_existing/load_field_existing';
import { ExistenceFetchStatus } from '../types';

const dslQuery = { bool: { must: [], filter: [], should: [], must_not: [] } };
const rollupAggsMock = {
  date_histogram: {
    '@timestamp': {
      agg: 'date_histogram',
      fixed_interval: '20m',
      delay: '10m',
      time_zone: 'UTC',
    },
  },
};

jest.spyOn(ExistingFieldsServiceApi, 'loadFieldExisting').mockImplementation(async () => ({
  indexPatternTitle: 'test',
  existingFieldNames: [],
}));

describe('UnifiedFieldList useExistingFields', () => {
  let mockedServices: ExistingFieldsFetcherParams['services'];
  const anotherDataView = createStubDataView({
    spec: {
      id: 'another-data-view',
      title: 'logstash-0',
      fields: stubFieldSpecMap,
    },
  });
  const dataViewWithRestrictions = createStubDataView({
    spec: {
      id: 'another-data-view-with-restrictions',
      title: 'logstash-1',
      fields: stubFieldSpecMap,
      typeMeta: {
        aggs: rollupAggsMock,
      },
    },
  });
  jest.spyOn(dataViewWithRestrictions, 'getAggregationRestrictions');

  beforeEach(() => {
    const dataViews = dataViewPluginMocks.createStartContract();
    const core = coreMock.createStart();
    mockedServices = {
      dataViews,
      data: dataPluginMock.createStartContract(),
      core,
    };

    core.uiSettings.get.mockImplementation((key: string) => {
      if (key === UI_SETTINGS.META_FIELDS) {
        return ['_id'];
      }
    });

    dataViews.get.mockImplementation(async (id: string) => {
      return [dataView, anotherDataView, dataViewWithRestrictions].find((dw) => dw.id === id)!;
    });

    (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockClear();
    (dataViewWithRestrictions.getAggregationRestrictions as jest.Mock).mockClear();
    resetExistingFieldsCache();
  });

  it('should work correctly based on the specified data view', async () => {
    const dataViewId = dataView.id!;
    (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockImplementation(async () => {
      return {
        existingFieldNames: [dataView.fields[0].name],
      };
    });

    renderHook(useExistingFieldsFetcher, {
      initialProps: {
        dataViews: [dataView],
        services: mockedServices,
        fromDate: '2019-01-01',
        toDate: '2020-01-01',
        query: { query: '', language: 'lucene' },
        filters: [],
      },
    });

    const hookReader = renderHook(useExistingFieldsReader);

    await waitFor(() => new Promise((resolve) => resolve(null)));

    expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledWith(
      expect.objectContaining({
        fromDate: '2019-01-01',
        toDate: '2020-01-01',
        dslQuery,
        dataView,
        timeFieldName: dataView.timeFieldName,
      })
    );

    // has existence info for the loaded data view => works more restrictive
    expect(hookReader.result.current.isFieldsExistenceInfoUnavailable(dataViewId)).toBe(false);
    expect(hookReader.result.current.hasFieldData(dataViewId, dataView.fields[0].name)).toBe(true);
    expect(hookReader.result.current.hasFieldData(dataViewId, dataView.fields[1].name)).toBe(false);
    expect(hookReader.result.current.getFieldsExistenceStatus(dataViewId)).toBe(
      ExistenceFetchStatus.succeeded
    );
    expect(hookReader.result.current.getNewFields(dataViewId)).toStrictEqual([]);

    // does not have existence info => works less restrictive
    const anotherDataViewId = 'test-id';
    expect(hookReader.result.current.isFieldsExistenceInfoUnavailable(anotherDataViewId)).toBe(
      false
    );
    expect(hookReader.result.current.hasFieldData(anotherDataViewId, dataView.fields[0].name)).toBe(
      true
    );
    expect(hookReader.result.current.hasFieldData(anotherDataViewId, dataView.fields[1].name)).toBe(
      true
    );
    expect(hookReader.result.current.getFieldsExistenceStatus(anotherDataViewId)).toBe(
      ExistenceFetchStatus.unknown
    );
    expect(hookReader.result.current.getNewFields(dataViewId)).toStrictEqual([]);
  });

  it('should work correctly with multiple readers', async () => {
    const dataViewId = dataView.id!;
    (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockImplementation(async () => {
      return {
        existingFieldNames: [dataView.fields[0].name],
      };
    });

    const hookFetcher = renderHook(useExistingFieldsFetcher, {
      initialProps: {
        dataViews: [dataView],
        services: mockedServices,
        fromDate: '2019-01-01',
        toDate: '2020-01-01',
        query: { query: '', language: 'lucene' },
        filters: [],
      },
    });

    const hookReader1 = renderHook(useExistingFieldsReader);
    const hookReader2 = renderHook(useExistingFieldsReader);

    await waitFor(() => new Promise((resolve) => resolve(null)));

    expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalled();

    const checkResults = (currentResult: ExistingFieldsReader) => {
      expect(currentResult.isFieldsExistenceInfoUnavailable(dataViewId)).toBe(false);
      expect(currentResult.hasFieldData(dataViewId, dataView.fields[0].name)).toBe(true);
      expect(currentResult.hasFieldData(dataViewId, dataView.fields[1].name)).toBe(false);
      expect(currentResult.getFieldsExistenceStatus(dataViewId)).toBe(
        ExistenceFetchStatus.succeeded
      );
    };

    // both readers should get the same results

    checkResults(hookReader1.result.current);
    checkResults(hookReader2.result.current);

    // info should be persisted even if the fetcher was unmounted

    hookFetcher.unmount();

    checkResults(hookReader1.result.current);
    checkResults(hookReader2.result.current);
  });

  it('should work correctly if load fails', async () => {
    const dataViewId = dataView.id!;
    (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockImplementation(async () => {
      throw new Error('test');
    });

    renderHook(useExistingFieldsFetcher, {
      initialProps: {
        dataViews: [dataView],
        services: mockedServices,
        fromDate: '2019-01-01',
        toDate: '2020-01-01',
        query: { query: '', language: 'lucene' },
        filters: [],
      },
    });

    const hookReader = renderHook(useExistingFieldsReader);

    await waitFor(() => new Promise((resolve) => resolve(null)));

    expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalled();

    const currentResult = hookReader.result.current;
    expect(currentResult.isFieldsExistenceInfoUnavailable(dataViewId)).toBe(true);
    expect(currentResult.hasFieldData(dataViewId, dataView.fields[0].name)).toBe(true);
    expect(currentResult.getFieldsExistenceStatus(dataViewId)).toBe(ExistenceFetchStatus.failed);
    expect(currentResult.getNewFields(dataViewId)).toStrictEqual([]);
  });

  it('should work correctly for multiple data views', async () => {
    (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockImplementation(
      async ({ dataView: currentDataView }) => {
        return {
          existingFieldNames: [currentDataView.fields[0].name],
        };
      }
    );

    renderHook(useExistingFieldsFetcher, {
      initialProps: {
        dataViews: [dataView, anotherDataView, dataViewWithRestrictions],
        services: mockedServices,
        fromDate: '2019-01-01',
        toDate: '2020-01-01',
        query: { query: '', language: 'lucene' },
        filters: [],
      },
    });

    const hookReader = renderHook(useExistingFieldsReader);
    await waitFor(() => new Promise((resolve) => resolve(null)));

    const currentResult = hookReader.result.current;

    expect(currentResult.isFieldsExistenceInfoUnavailable(dataView.id!)).toBe(false);
    expect(currentResult.isFieldsExistenceInfoUnavailable(anotherDataView.id!)).toBe(false);
    expect(currentResult.isFieldsExistenceInfoUnavailable(dataViewWithRestrictions.id!)).toBe(true);
    expect(currentResult.isFieldsExistenceInfoUnavailable('test-id')).toBe(false);

    expect(currentResult.hasFieldData(dataView.id!, dataView.fields[0].name)).toBe(true);
    expect(currentResult.hasFieldData(dataView.id!, dataView.fields[1].name)).toBe(false);

    expect(currentResult.hasFieldData(anotherDataView.id!, anotherDataView.fields[0].name)).toBe(
      true
    );
    expect(currentResult.hasFieldData(anotherDataView.id!, anotherDataView.fields[1].name)).toBe(
      false
    );

    expect(
      currentResult.hasFieldData(
        dataViewWithRestrictions.id!,
        dataViewWithRestrictions.fields[0].name
      )
    ).toBe(true);
    expect(
      currentResult.hasFieldData(
        dataViewWithRestrictions.id!,
        dataViewWithRestrictions.fields[1].name
      )
    ).toBe(true);
    expect(currentResult.hasFieldData('test-id', 'test-field')).toBe(true);

    expect(currentResult.getFieldsExistenceStatus(dataView.id!)).toBe(
      ExistenceFetchStatus.succeeded
    );
    expect(currentResult.getFieldsExistenceStatus(anotherDataView.id!)).toBe(
      ExistenceFetchStatus.succeeded
    );
    expect(currentResult.getFieldsExistenceStatus(dataViewWithRestrictions.id!)).toBe(
      ExistenceFetchStatus.succeeded
    );
    expect(currentResult.getFieldsExistenceStatus('test-id')).toBe(ExistenceFetchStatus.unknown);

    expect(dataViewWithRestrictions.getAggregationRestrictions).toHaveBeenCalledTimes(1);
    expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledTimes(2);
  });

  it('should work correctly for data views with restrictions', async () => {
    const dataViewId = dataViewWithRestrictions.id!;
    (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockImplementation(async () => {
      throw new Error('test');
    });

    const hookFetcher = renderHook(useExistingFieldsFetcher, {
      initialProps: {
        dataViews: [dataViewWithRestrictions],
        services: mockedServices,
        fromDate: '2019-01-01',
        toDate: '2020-01-01',
        query: { query: '', language: 'lucene' },
        filters: [],
      },
    });

    const hookReader = renderHook(useExistingFieldsReader);
    await waitFor(() => () => !hookFetcher.result.current.isProcessing);

    expect(dataViewWithRestrictions.getAggregationRestrictions).toHaveBeenCalled();
    expect(ExistingFieldsServiceApi.loadFieldExisting).not.toHaveBeenCalled();

    const currentResult = hookReader.result.current;
    expect(currentResult.isFieldsExistenceInfoUnavailable(dataViewId)).toBe(true);
    expect(currentResult.hasFieldData(dataViewId, dataViewWithRestrictions.fields[0].name)).toBe(
      true
    );
    expect(currentResult.getFieldsExistenceStatus(dataViewId)).toBe(ExistenceFetchStatus.succeeded);
  });

  it('should work correctly for when data views are changed', async () => {
    (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockImplementation(
      async ({ dataView: currentDataView }) => {
        return {
          existingFieldNames: [currentDataView.fields[0].name],
        };
      }
    );

    const params: ExistingFieldsFetcherParams = {
      dataViews: [dataView],
      services: mockedServices,
      fromDate: '2019-01-01',
      toDate: '2020-01-01',
      query: { query: '', language: 'lucene' },
      filters: [],
    };
    const hookFetcher = renderHook(useExistingFieldsFetcher, {
      initialProps: params,
    });

    const hookReader = renderHook(useExistingFieldsReader);
    await waitFor(() => new Promise((resolve) => resolve(null)));

    expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledWith(
      expect.objectContaining({
        fromDate: '2019-01-01',
        toDate: '2020-01-01',
        dslQuery,
        dataView,
        timeFieldName: dataView.timeFieldName,
      })
    );

    expect(hookReader.result.current.getFieldsExistenceStatus(dataView.id!)).toBe(
      ExistenceFetchStatus.succeeded
    );
    expect(hookReader.result.current.getFieldsExistenceStatus(anotherDataView.id!)).toBe(
      ExistenceFetchStatus.unknown
    );

    hookFetcher.rerender({
      ...params,
      dataViews: [dataView, anotherDataView],
    });

    await waitFor(() => new Promise((resolve) => resolve(null)));

    expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        fromDate: '2019-01-01',
        toDate: '2020-01-01',
        dslQuery,
        dataView,
        timeFieldName: dataView.timeFieldName,
      })
    );

    expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        fromDate: '2019-01-01',
        toDate: '2020-01-01',
        dslQuery,
        dataView: anotherDataView,
        timeFieldName: anotherDataView.timeFieldName,
      })
    );

    expect(hookReader.result.current.getFieldsExistenceStatus(dataView.id!)).toBe(
      ExistenceFetchStatus.succeeded
    );
    expect(hookReader.result.current.getFieldsExistenceStatus(anotherDataView.id!)).toBe(
      ExistenceFetchStatus.succeeded
    );
  });

  it('should work correctly for when params are changed', async () => {
    (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockImplementation(
      async ({ dataView: currentDataView }) => {
        return {
          existingFieldNames: [currentDataView.fields[0].name],
        };
      }
    );

    const params: ExistingFieldsFetcherParams = {
      dataViews: [dataView],
      services: mockedServices,
      fromDate: '2019-01-01',
      toDate: '2020-01-01',
      query: { query: '', language: 'lucene' },
      filters: [],
    };
    const hookFetcher = renderHook(useExistingFieldsFetcher, {
      initialProps: params,
    });

    const hookReader = renderHook(useExistingFieldsReader);
    await waitFor(() => new Promise((resolve) => resolve(null)));

    expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledWith(
      expect.objectContaining({
        fromDate: '2019-01-01',
        toDate: '2020-01-01',
        dslQuery,
        dataView,
        timeFieldName: dataView.timeFieldName,
      })
    );

    expect(hookReader.result.current.getFieldsExistenceStatus(dataView.id!)).toBe(
      ExistenceFetchStatus.succeeded
    );

    hookFetcher.rerender({
      ...params,
      fromDate: '2021-01-01',
      toDate: '2022-01-01',
      query: { query: 'test', language: 'kuery' },
    });

    await waitFor(() =>
      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          fromDate: '2021-01-01',
          toDate: '2022-01-01',
          dslQuery: {
            bool: {
              filter: [
                {
                  multi_match: {
                    lenient: true,
                    query: 'test',
                    type: 'best_fields',
                  },
                },
              ],
              must: [],
              must_not: [],
              should: [],
            },
          },
          dataView,
          timeFieldName: dataView.timeFieldName,
        })
      )
    );
  });

  it('should call onNoData callback only once', async () => {
    (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockImplementation(async () => {
      return {
        existingFieldNames: ['_id'],
      };
    });

    const params: ExistingFieldsFetcherParams = {
      dataViews: [dataView],
      services: mockedServices,
      fromDate: '2019-01-01',
      toDate: '2020-01-01',
      query: { query: '', language: 'lucene' },
      filters: [],
      onNoData: jest.fn(),
    };
    const hookFetcher = renderHook(useExistingFieldsFetcher, {
      initialProps: params,
    });

    const hookReader = renderHook(useExistingFieldsReader);
    await waitFor(() => new Promise((resolve) => resolve(null)));

    expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledWith(
      expect.objectContaining({
        fromDate: '2019-01-01',
        toDate: '2020-01-01',
        dslQuery,
        dataView,
        timeFieldName: dataView.timeFieldName,
      })
    );

    expect(hookReader.result.current.getFieldsExistenceStatus(dataView.id!)).toBe(
      ExistenceFetchStatus.succeeded
    );

    expect(params.onNoData).toHaveBeenCalledWith(dataView.id);
    expect(params.onNoData).toHaveBeenCalledTimes(1);

    hookFetcher.rerender({
      ...params,
      fromDate: '2021-01-01',
      toDate: '2022-01-01',
    });

    await waitFor(() => new Promise((resolve) => resolve(null)));

    expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        fromDate: '2021-01-01',
        toDate: '2022-01-01',
        dslQuery,
        dataView,
        timeFieldName: dataView.timeFieldName,
      })
    );

    expect(params.onNoData).toHaveBeenCalledTimes(1); // still 1 time
  });

  it('should include newFields', async () => {
    const newFields = [{ name: 'test', type: 'keyword', searchable: true, aggregatable: true }];

    (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockImplementation(
      async ({ dataView: currentDataView }) => {
        return {
          existingFieldNames: [currentDataView.fields[0].name],
          newFields,
        };
      }
    );

    const params: ExistingFieldsFetcherParams = {
      dataViews: [dataView],
      services: mockedServices,
      fromDate: '2019-01-01',
      toDate: '2020-01-01',
      query: { query: '', language: 'lucene' },
      filters: [],
    };
    renderHook(useExistingFieldsFetcher, {
      initialProps: params,
    });

    const hookReader = renderHook(useExistingFieldsReader);
    await waitFor(() => new Promise((resolve) => resolve(null)));

    expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledWith(
      expect.objectContaining({
        fromDate: '2019-01-01',
        toDate: '2020-01-01',
        dslQuery,
        dataView,
        timeFieldName: dataView.timeFieldName,
      })
    );

    expect(hookReader.result.current.getFieldsExistenceStatus(dataView.id!)).toBe(
      ExistenceFetchStatus.succeeded
    );

    expect(hookReader.result.current.getNewFields(dataView.id!)).toBe(newFields);
    expect(hookReader.result.current.getNewFields('another-id')).toStrictEqual([]);
  });
});
