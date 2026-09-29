/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import type { AggConfigOptions, AggConfigsOptions, GetConfigFn } from '@kbn/data-plugin/common';
import { AggConfig, AggConfigs } from '@kbn/data-plugin/common';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import type { Vis } from '../vis';
import { getColumnsFromVis } from './schemas';

const mockConvertMetricToColumns = vi.fn();
const mockConvertBucketToColumns = vi.fn();
const mockGetCutomBucketsFromSiblingAggs = vi.fn();
const mockGetCustomBucketColumns = vi.fn();
const mockGetVisSchemas = vi.fn();

const mockGetBucketCollapseFn = vi.fn();
const mockGetBucketColumns = vi.fn();
const mockGetColumnIds = vi.fn();
const mockGetColumnsWithoutReferenced = vi.fn();
const mockGetMetricsWithoutDuplicates = vi.fn();
const mockIsValidVis = vi.fn();
const mockSortColumns = vi.fn();

vi.mock('../../common/convert_to_lens/lib/metrics', () => {
      const mocked = {
      convertMetricToColumns: vi.fn(() => mockConvertMetricToColumns()),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../common/convert_to_lens/lib/buckets', () => {
      const mocked = {
      convertBucketToColumns: vi.fn(() => mockConvertBucketToColumns()),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../common/convert_to_lens/lib/utils', async () => {
  const utils = (await vi.importActual('../../common/convert_to_lens/lib/utils'));
  return {
    ...utils,
    getCustomBucketsFromSiblingAggs: vi.fn(() => mockGetCutomBucketsFromSiblingAggs()),
  };
});

vi.mock('../vis_schemas', () => {
      const mocked = {
      getVisSchemas: vi.fn(() => mockGetVisSchemas()),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./utils', () => {
      const mocked = {
      getBucketCollapseFn: vi.fn(() => mockGetBucketCollapseFn()),
      getBucketColumns: vi.fn(() => mockGetBucketColumns()),
      getColumnIds: vi.fn(() => mockGetColumnIds()),
      getColumnsWithoutReferenced: vi.fn(() => mockGetColumnsWithoutReferenced()),
      getMetricsWithoutDuplicates: vi.fn(() => mockGetMetricsWithoutDuplicates()),
      isValidVis: vi.fn(() => mockIsValidVis()),
      sortColumns: vi.fn(() => mockSortColumns()),
      getCustomBucketColumns: vi.fn(() => mockGetCustomBucketColumns()),
    };
      return { ...mocked, default: mocked };
    });

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
    vi.clearAllMocks();
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
    expect(mockGetVisSchemas).toHaveBeenCalledTimes(1);
    expect(mockIsValidVis).toHaveBeenCalledTimes(1);
    expect(mockGetCutomBucketsFromSiblingAggs).toHaveBeenCalledTimes(0);
  });

  test('should return null if multiple different sibling aggs was provided', () => {
    const buckets: AggConfig[] = [aggConfig, aggConfig];
    mockGetCutomBucketsFromSiblingAggs.mockReturnValue(buckets);

    const result = getColumnsFromVis(vis, dataServiceMock.query.timefilter.timefilter, dataView, {
      splits: [],
      buckets: [],
    });

    expect(result).toBeNull();
    expect(mockGetVisSchemas).toHaveBeenCalledTimes(1);
    expect(mockIsValidVis).toHaveBeenCalledTimes(1);
    expect(mockGetCutomBucketsFromSiblingAggs).toHaveBeenCalledTimes(1);
    expect(mockGetMetricsWithoutDuplicates).toHaveBeenCalledTimes(0);
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
    expect(mockGetVisSchemas).toHaveBeenCalledTimes(1);
    expect(mockIsValidVis).toHaveBeenCalledTimes(1);
    expect(mockGetCutomBucketsFromSiblingAggs).toHaveBeenCalledTimes(1);
    expect(mockGetMetricsWithoutDuplicates).toHaveBeenCalledTimes(1);
    expect(mockGetCustomBucketColumns).toHaveBeenCalledTimes(1);
    expect(mockGetBucketColumns).toHaveBeenCalledTimes(0);
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
    expect(mockGetVisSchemas).toHaveBeenCalledTimes(1);
    expect(mockIsValidVis).toHaveBeenCalledTimes(1);
    expect(mockGetCutomBucketsFromSiblingAggs).toHaveBeenCalledTimes(1);
    expect(mockGetMetricsWithoutDuplicates).toHaveBeenCalledTimes(1);
    expect(mockConvertMetricToColumns).toHaveBeenCalledTimes(1);
    expect(mockGetBucketColumns).toHaveBeenCalledTimes(0);
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
    expect(mockGetVisSchemas).toHaveBeenCalledTimes(1);
    expect(mockIsValidVis).toHaveBeenCalledTimes(1);
    expect(mockGetCutomBucketsFromSiblingAggs).toHaveBeenCalledTimes(1);
    expect(mockGetMetricsWithoutDuplicates).toHaveBeenCalledTimes(1);
    expect(mockConvertMetricToColumns).toHaveBeenCalledTimes(1);
    expect(mockGetBucketColumns).toHaveBeenCalledTimes(1);
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
    expect(mockGetVisSchemas).toHaveBeenCalledTimes(1);
    expect(mockIsValidVis).toHaveBeenCalledTimes(1);
    expect(mockGetCutomBucketsFromSiblingAggs).toHaveBeenCalledTimes(1);
    expect(mockGetMetricsWithoutDuplicates).toHaveBeenCalledTimes(1);
    expect(mockConvertMetricToColumns).toHaveBeenCalledTimes(1);
    expect(mockGetBucketColumns).toHaveBeenCalledTimes(2);
    expect(mockSortColumns).toHaveBeenCalledTimes(0);
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
    expect(mockGetVisSchemas).toHaveBeenCalledTimes(1);
    expect(mockIsValidVis).toHaveBeenCalledTimes(1);
    expect(mockGetCutomBucketsFromSiblingAggs).toHaveBeenCalledTimes(1);
    expect(mockGetMetricsWithoutDuplicates).toHaveBeenCalledTimes(1);
    expect(mockConvertMetricToColumns).toHaveBeenCalledTimes(1);
    expect(mockGetBucketColumns).toHaveBeenCalledTimes(2);
    expect(mockSortColumns).toHaveBeenCalledTimes(1);
    expect(mockGetColumnsWithoutReferenced).toHaveBeenCalledTimes(1);
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
    expect(mockGetVisSchemas).toHaveBeenCalledTimes(1);
    expect(mockIsValidVis).toHaveBeenCalledTimes(1);
    expect(mockGetCutomBucketsFromSiblingAggs).toHaveBeenCalledTimes(1);
    expect(mockGetMetricsWithoutDuplicates).toHaveBeenCalledTimes(1);
    expect(mockConvertMetricToColumns).toHaveBeenCalledTimes(2);
    expect(mockGetBucketColumns).toHaveBeenCalledTimes(4);
    expect(mockSortColumns).toHaveBeenCalledTimes(2);
    expect(mockGetColumnsWithoutReferenced).toHaveBeenCalledTimes(2);
  });
});
