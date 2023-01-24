/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  AggConfig,
  AggConfigOptions,
  AggConfigs,
  AggConfigsOptions,
  GetConfigFn,
} from '@kbn/data-plugin/common';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import type { Vis } from '../vis';
import { getColumnsFromVis } from './schemas';

const mockConvertMetricToColumns = jest.fn();
const mockConvertBucketToColumns = jest.fn();
const mockGetCutomBucketsFromSiblingAggs = jest.fn();
const mockGetCustomBucketColumns = jest.fn();
const mockGetVisSchemas = jest.fn();

const mockGetBucketCollapseFn = jest.fn();
const mockGetBucketColumns = jest.fn();
const mockGetColumnIds = jest.fn();
const mockGetColumnsWithoutReferenced = jest.fn();
const mockGetMetricsWithoutDuplicates = jest.fn();
const mockIsValidVis = jest.fn();
const mockSortColumns = jest.fn();

jest.mock('../../common/convert_to_lens/lib/metrics', () => ({
  convertMetricToColumns: jest.fn(() => mockConvertMetricToColumns()),
}));

jest.mock('../../common/convert_to_lens/lib/buckets', () => ({
  convertBucketToColumns: jest.fn(() => mockConvertBucketToColumns()),
}));

jest.mock('../../common/convert_to_lens/lib/utils', () => ({
  getCustomBucketsFromSiblingAggs: jest.fn(() => mockGetCutomBucketsFromSiblingAggs()),
}));

jest.mock('../vis_schemas', () => ({
  getVisSchemas: jest.fn(() => mockGetVisSchemas()),
}));

jest.mock('./utils', () => ({
  getBucketCollapseFn: jest.fn(() => mockGetBucketCollapseFn()),
  getBucketColumns: jest.fn(() => mockGetBucketColumns()),
  getColumnIds: jest.fn(() => mockGetColumnIds()),
  getColumnsWithoutReferenced: jest.fn(() => mockGetColumnsWithoutReferenced()),
  getMetricsWithoutDuplicates: jest.fn(() => mockGetMetricsWithoutDuplicates()),
  isValidVis: jest.fn(() => mockIsValidVis()),
  sortColumns: jest.fn(() => mockSortColumns()),
  getCustomBucketColumns: jest.fn(() => mockGetCustomBucketColumns()),
}));

describe('getColumnsFromVis', () => {
  const dataServiceMock = dataPluginMock.createStartContract();
  const dataView = stubLogstashDataView;
  const aggConfigs = new AggConfigs(
    dataView,
    [],
    {} as AggConfigsOptions,
    (() => ({})) as GetConfigFn
  );
  const aggConfig = new AggConfig(aggConfigs, {} as AggConfigOptions);

  const vis = {
    type: { name: 'heatmap' },
  } as Vis;
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetVisSchemas.mockReturnValue({});
    mockIsValidVis.mockReturnValue(true);
    mockGetCustomBucketColumns.mockReturnValue({ customBucketColumns: [], customBucketsMap: {} });
  });

  test('should return null if vis is not valid', () => {
    mockIsValidVis.mockReturnValue(false);
    const result = getColumnsFromVis(vis, dataServiceMock.query.timefilter.timefilter, dataView, {
      splits: [],
      buckets: [],
    });

    expect(result).toBeNull();
    expect(mockGetVisSchemas).toBeCalledTimes(1);
    expect(mockIsValidVis).toBeCalledTimes(1);
    expect(mockGetCutomBucketsFromSiblingAggs).toBeCalledTimes(0);
  });

  test('should return null if multiple different sibling aggs was provided', () => {
    const buckets: AggConfig[] = [aggConfig, aggConfig];
    mockGetCutomBucketsFromSiblingAggs.mockReturnValue(buckets);

    const result = getColumnsFromVis(vis, dataServiceMock.query.timefilter.timefilter, dataView, {
      splits: [],
      buckets: [],
    });

    expect(result).toBeNull();
    expect(mockGetVisSchemas).toBeCalledTimes(1);
    expect(mockIsValidVis).toBeCalledTimes(1);
    expect(mockGetCutomBucketsFromSiblingAggs).toBeCalledTimes(1);
    expect(mockGetMetricsWithoutDuplicates).toBeCalledTimes(0);
  });

  test('should return null if one sibling agg was provided and it is not supported', () => {
    const buckets: AggConfig[] = [aggConfig];
    mockGetCutomBucketsFromSiblingAggs.mockReturnValue(buckets);
    mockGetCustomBucketColumns.mockReturnValue({
      customBucketColumns: [null],
      customBucketsMap: {},
    });
    mockGetMetricsWithoutDuplicates.mockReturnValue([{}]);

    const result = getColumnsFromVis(vis, dataServiceMock.query.timefilter.timefilter, dataView, {
      splits: [],
      buckets: [],
    });

    expect(result).toBeNull();
    expect(mockGetVisSchemas).toBeCalledTimes(1);
    expect(mockIsValidVis).toBeCalledTimes(1);
    expect(mockGetCutomBucketsFromSiblingAggs).toBeCalledTimes(1);
    expect(mockGetMetricsWithoutDuplicates).toBeCalledTimes(1);
    expect(mockGetCustomBucketColumns).toBeCalledTimes(1);
    expect(mockGetBucketColumns).toBeCalledTimes(0);
  });

  test('should return null if metrics are not supported', () => {
    const buckets: AggConfig[] = [aggConfig];
    mockGetCutomBucketsFromSiblingAggs.mockReturnValue(buckets);
    mockGetMetricsWithoutDuplicates.mockReturnValue([{}]);
    mockConvertMetricToColumns.mockReturnValue([null, {}]);

    const result = getColumnsFromVis(vis, dataServiceMock.query.timefilter.timefilter, dataView, {
      splits: [],
      buckets: [],
    });

    expect(result).toBeNull();
    expect(mockGetVisSchemas).toBeCalledTimes(1);
    expect(mockIsValidVis).toBeCalledTimes(1);
    expect(mockGetCutomBucketsFromSiblingAggs).toBeCalledTimes(1);
    expect(mockGetMetricsWithoutDuplicates).toBeCalledTimes(1);
    expect(mockConvertMetricToColumns).toBeCalledTimes(1);
    expect(mockGetBucketColumns).toBeCalledTimes(0);
  });

  test('should return null if buckets are not supported', () => {
    const buckets: AggConfig[] = [aggConfig];
    mockGetCutomBucketsFromSiblingAggs.mockReturnValue(buckets);
    mockConvertBucketToColumns.mockReturnValue({});
    mockGetMetricsWithoutDuplicates.mockReturnValue([{}]);
    mockConvertMetricToColumns.mockReturnValue([{}]);
    mockGetBucketColumns.mockReturnValue(null);

    const result = getColumnsFromVis(vis, dataServiceMock.query.timefilter.timefilter, dataView, {
      splits: [],
      buckets: [],
    });

    expect(result).toBeNull();
    expect(mockGetVisSchemas).toBeCalledTimes(1);
    expect(mockIsValidVis).toBeCalledTimes(1);
    expect(mockGetCutomBucketsFromSiblingAggs).toBeCalledTimes(1);
    expect(mockGetMetricsWithoutDuplicates).toBeCalledTimes(1);
    expect(mockConvertMetricToColumns).toBeCalledTimes(1);
    expect(mockGetBucketColumns).toBeCalledTimes(1);
  });

  test('should return null if splits are not supported', () => {
    const buckets: AggConfig[] = [aggConfig];
    mockGetCutomBucketsFromSiblingAggs.mockReturnValue(buckets);
    mockConvertBucketToColumns.mockReturnValue({});
    mockGetMetricsWithoutDuplicates.mockReturnValue([{}]);
    mockConvertMetricToColumns.mockReturnValue([{}]);
    mockGetBucketColumns.mockReturnValueOnce([{}]);
    mockGetBucketColumns.mockReturnValueOnce(null);

    const result = getColumnsFromVis(vis, dataServiceMock.query.timefilter.timefilter, dataView, {
      splits: [],
      buckets: [],
    });

    expect(result).toBeNull();
    expect(mockGetVisSchemas).toBeCalledTimes(1);
    expect(mockIsValidVis).toBeCalledTimes(1);
    expect(mockGetCutomBucketsFromSiblingAggs).toBeCalledTimes(1);
    expect(mockGetMetricsWithoutDuplicates).toBeCalledTimes(1);
    expect(mockConvertMetricToColumns).toBeCalledTimes(1);
    expect(mockGetBucketColumns).toBeCalledTimes(2);
    expect(mockSortColumns).toBeCalledTimes(0);
  });

  test('should return one layer with columns', () => {
    const buckets: AggConfig[] = [aggConfig];
    const bucketColumns = [
      {
        sourceField: 'some-field',
        columnId: 'col3',
        operationType: 'date_histogram',
        isBucketed: false,
        isSplit: false,
        dataType: 'string',
        params: { interval: '1h' },
        meta: { aggId: 'agg-id-1' },
      },
    ];
    const metrics = [
      {
        sourceField: 'some-field',
        columnId: 'col2',
        operationType: 'max',
        isBucketed: false,
        isSplit: false,
        dataType: 'string',
        params: {},
        meta: { aggId: 'col-id-3' },
      },
    ];

    const columnsWithoutReferenced = ['col2'];
    const metricId = 'metric1';
    const bucketId = 'bucket1';
    const bucketCollapseFn = 'max';

    mockGetCutomBucketsFromSiblingAggs.mockReturnValue([]);
    mockGetMetricsWithoutDuplicates.mockReturnValue(metrics);
    mockConvertMetricToColumns.mockReturnValue(metrics);
    mockConvertBucketToColumns.mockReturnValue(bucketColumns);
    mockGetBucketColumns.mockReturnValue(bucketColumns);
    mockGetColumnsWithoutReferenced.mockReturnValue(columnsWithoutReferenced);
    mockSortColumns.mockReturnValue([...metrics, ...buckets]);
    mockGetColumnIds.mockReturnValueOnce([metricId]);
    mockGetColumnIds.mockReturnValueOnce([bucketId]);
    mockGetBucketCollapseFn.mockReturnValueOnce(bucketCollapseFn);

    const result = getColumnsFromVis(vis, dataServiceMock.query.timefilter.timefilter, dataView, {
      splits: [],
      buckets: [],
    });

    expect(result).toEqual([
      {
        bucketCollapseFn,
        buckets: {
          all: [bucketId],
          customBuckets: {},
        },
        columns: [...metrics, ...buckets],
        columnsWithoutReferenced,
        metrics: [metricId],
      },
    ]);
    expect(mockGetVisSchemas).toBeCalledTimes(1);
    expect(mockIsValidVis).toBeCalledTimes(1);
    expect(mockGetCutomBucketsFromSiblingAggs).toBeCalledTimes(1);
    expect(mockGetMetricsWithoutDuplicates).toBeCalledTimes(1);
    expect(mockConvertMetricToColumns).toBeCalledTimes(1);
    expect(mockGetBucketColumns).toBeCalledTimes(2);
    expect(mockSortColumns).toBeCalledTimes(1);
    expect(mockGetColumnsWithoutReferenced).toBeCalledTimes(1);
  });

  test('should return several layer with columns if series is provided', () => {
    const buckets: AggConfig[] = [aggConfig];
    const bucketColumns = [
      {
        sourceField: 'some-field',
        columnId: 'col3',
        operationType: 'date_histogram',
        isBucketed: false,
        isSplit: false,
        dataType: 'string',
        params: { interval: '1h' },
        meta: { aggId: 'agg-id-1' },
      },
    ];
    const mectricAggs = [{ aggId: 'col-id-3' }, { aggId: 'col-id-4' }];
    const metrics = [
      {
        sourceField: 'some-field',
        columnId: 'col2',
        operationType: 'max',
        isBucketed: false,
        isSplit: false,
        dataType: 'string',
        params: {},
        meta: { aggId: 'col-id-3' },
      },
      {
        sourceField: 'some-field',
        columnId: 'col3',
        operationType: 'max',
        isBucketed: false,
        isSplit: false,
        dataType: 'string',
        params: {},
        meta: { aggId: 'col-id-4' },
      },
    ];

    const columnsWithoutReferenced = ['col2'];
    const metricId = 'metric1';
    const bucketId = 'bucket1';
    const bucketCollapseFn = 'max';

    mockGetCutomBucketsFromSiblingAggs.mockReturnValue([]);
    mockGetMetricsWithoutDuplicates.mockReturnValue(mectricAggs);
    mockConvertMetricToColumns.mockReturnValue(metrics);
    mockConvertBucketToColumns.mockReturnValue(bucketColumns);
    mockGetBucketColumns.mockReturnValue(bucketColumns);
    mockGetColumnsWithoutReferenced.mockReturnValue(columnsWithoutReferenced);
    mockSortColumns.mockReturnValue([...metrics, ...buckets]);
    mockGetColumnIds.mockReturnValueOnce([metricId]);
    mockGetColumnIds.mockReturnValueOnce([bucketId]);
    mockGetColumnIds.mockReturnValueOnce([metricId]);
    mockGetColumnIds.mockReturnValueOnce([bucketId]);
    mockGetBucketCollapseFn.mockReturnValueOnce(bucketCollapseFn);
    mockGetBucketCollapseFn.mockReturnValueOnce(bucketCollapseFn);

    const result = getColumnsFromVis(
      vis,
      dataServiceMock.query.timefilter.timefilter,
      dataView,
      {
        splits: [],
        buckets: [],
      },
      undefined,
      [{ metrics: ['col-id-3'] }, { metrics: ['col-id-4'] }]
    );

    expect(result?.length).toEqual(2);
    expect(mockGetVisSchemas).toBeCalledTimes(1);
    expect(mockIsValidVis).toBeCalledTimes(1);
    expect(mockGetCutomBucketsFromSiblingAggs).toBeCalledTimes(1);
    expect(mockGetMetricsWithoutDuplicates).toBeCalledTimes(1);
    expect(mockConvertMetricToColumns).toBeCalledTimes(2);
    expect(mockGetBucketColumns).toBeCalledTimes(4);
    expect(mockSortColumns).toBeCalledTimes(2);
    expect(mockGetColumnsWithoutReferenced).toBeCalledTimes(2);
  });
});
