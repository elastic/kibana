/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BUCKET_TYPES, IAggConfig, METRIC_TYPES } from '@kbn/data-plugin/common';
import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import {
  AggBasedColumn,
  CounterRateColumn,
  GenericColumnWithMeta,
  SchemaConfig,
  SupportedAggregation,
} from '../../common';
import {
  AvgColumn,
  CountColumn,
  MaxColumn,
  DateHistogramColumn,
  Meta,
} from '../../common/convert_to_lens/lib';
import {
  getBucketCollapseFn,
  getBucketColumns,
  getColumnIds,
  getColumnsWithoutReferenced,
  getCustomBucketColumns,
  getMetricsWithoutDuplicates,
  isReferenced,
  isValidVis,
  sortColumns,
} from './utils';
import { Schemas } from '../vis_schemas';

const mockConvertBucketToColumns = jest.fn();

jest.mock('../../common/convert_to_lens/lib/buckets', () => ({
  convertBucketToColumns: jest.fn(() => mockConvertBucketToColumns()),
}));

describe('isReferenced', () => {
  const columnId = 'col1';
  const references = ['col0', columnId, '----'];

  test.each<[string, [string, string[]], boolean]>([
    ['false if referneces are empty', [columnId, []], false],
    ['false if columnId is not in referneces', ['some new column', references], false],
    ['true if columnId is in referneces', [columnId, references], true],
  ])('should return %s', (_, input, expected) => {
    expect(isReferenced(...input)).toBe(expected);
  });
});

describe('getColumnsWithoutReferenced', () => {
  const column: AvgColumn = {
    sourceField: 'some-field',
    columnId: 'col3',
    operationType: 'average',
    isBucketed: false,
    isSplit: false,
    dataType: 'string',
    params: {},
    meta: { aggId: 'some id' },
  };

  const referencedColumn: CountColumn = {
    sourceField: 'document',
    columnId: 'col1',
    operationType: 'count',
    isBucketed: false,
    isSplit: false,
    dataType: 'string',
    params: {},
    meta: { aggId: 'some id' },
  };

  const columnWithReference: GenericColumnWithMeta<CounterRateColumn, Meta> = {
    references: [referencedColumn.columnId],
    columnId: 'col2',
    operationType: 'counter_rate',
    isBucketed: false,
    isSplit: false,
    dataType: 'string',
    params: {},
    meta: { aggId: 'some id' },
  };

  const columns: AggBasedColumn[] = [column, columnWithReference, referencedColumn];
  const columnsWithoutReferenced = [column, columnWithReference];
  test.each<[string, AggBasedColumn[], AggBasedColumn[]]>([
    ['filter out referenced column if contains', columns, columnsWithoutReferenced],
    [
      'return the same array, if no referenced columns',
      columnsWithoutReferenced,
      columnsWithoutReferenced,
    ],
  ])('should %s', (_, input, expected) => {
    expect(getColumnsWithoutReferenced(input)).toEqual(expected);
  });
});

describe('getBucketCollapseFn', () => {
  const metric1: SchemaConfig<METRIC_TYPES.AVG> = {
    accessor: 0,
    aggId: '1',
    label: '',
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
    aggType: METRIC_TYPES.AVG,
  };

  const metric2: SchemaConfig<METRIC_TYPES.AVG_BUCKET> = {
    ...metric1,
    aggId: '2',
    aggType: METRIC_TYPES.AVG_BUCKET,
  };

  const metric3: SchemaConfig<METRIC_TYPES.MAX_BUCKET> = {
    ...metric1,
    aggId: '3',
    aggType: METRIC_TYPES.MAX_BUCKET,
  };

  const metric4: SchemaConfig<METRIC_TYPES.MIN_BUCKET> = {
    ...metric1,
    aggId: '4',
    aggType: METRIC_TYPES.MIN_BUCKET,
  };

  const metric5: SchemaConfig<METRIC_TYPES.SUM_BUCKET> = {
    ...metric1,
    aggId: '5',
    aggType: METRIC_TYPES.SUM_BUCKET,
  };

  const customBucketColum: AggBasedColumn = {
    columnId: 'bucket-1',
    operationType: 'date_histogram',
    sourceField: 'test',
    isBucketed: true,
    isSplit: false,
    params: {
      interval: '1h',
    },
    dataType: 'date',
    meta: {
      aggId: '1',
    },
  };

  test.each<
    [
      string,
      [
        Array<SchemaConfig<SupportedAggregation>>,
        AggBasedColumn[],
        Record<string, string>,
        AggBasedColumn[]
      ],
      Record<string, string[]>
    ]
  >([
    [
      'avg',
      [
        [metric1, metric2],
        [customBucketColum],
        { test: 'bucket-1' },
        [{ columnId: 'test', meta: { aggId: metric2.aggId } } as AggBasedColumn],
      ],
      { sum: [], min: [], max: [], avg: [customBucketColum.columnId] },
    ],
    [
      'max',
      [
        [metric1, metric3],
        [customBucketColum],
        { test: 'bucket-1' },
        [{ columnId: 'test', meta: { aggId: metric3.aggId } } as AggBasedColumn],
      ],
      { sum: [], min: [], max: [customBucketColum.columnId], avg: [] },
    ],
    [
      'min',
      [
        [metric1, metric4],
        [customBucketColum],
        { test: 'bucket-1' },
        [{ columnId: 'test', meta: { aggId: metric4.aggId } } as AggBasedColumn],
      ],
      { sum: [], min: [customBucketColum.columnId], max: [], avg: [] },
    ],
    [
      'sum',
      [
        [metric1, metric5],
        [customBucketColum],
        { test: 'bucket-1' },
        [{ columnId: 'test', meta: { aggId: metric5.aggId } } as AggBasedColumn],
      ],
      { sum: [customBucketColum.columnId], min: [], max: [], avg: [] },
    ],
  ])('should return%s', (_, input, expected) => {
    expect(getBucketCollapseFn(...input)).toEqual(expected);
  });
});

describe('getBucketColumns', () => {
  const dataView = stubLogstashDataView;
  const visType = 'heatmap';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should skip empty schemas and return empty array', () => {
    const metricKey = 'metric';
    const bucketKey = 'group';
    const keys = [metricKey, bucketKey];

    const visSchemas: Schemas = {
      [metricKey]: [],
      [bucketKey]: [],
    };

    expect(getBucketColumns(visType, visSchemas, keys, dataView, false, [])).toEqual([]);
    expect(mockConvertBucketToColumns).toBeCalledTimes(0);
  });

  test('should return null if metric is invalid', () => {
    const metricKey = 'metric';
    const bucketKey = 'group';
    const keys = [metricKey, bucketKey];

    const metric1: SchemaConfig<METRIC_TYPES.AVG> = {
      accessor: 0,
      label: '',
      format: {
        id: undefined,
        params: undefined,
      },
      params: {},
      aggType: METRIC_TYPES.AVG,
    };

    const visSchemas: Schemas = {
      [metricKey]: [metric1],
      [bucketKey]: [],
    };
    mockConvertBucketToColumns.mockReturnValueOnce(null);

    expect(getBucketColumns(visType, visSchemas, keys, dataView, false, [])).toBeNull();
    expect(mockConvertBucketToColumns).toBeCalledTimes(1);
  });

  test('should return null if no buckets are returned', () => {
    const metricKey = 'metric';
    const bucketKey = 'group';
    const keys = [metricKey, bucketKey];

    const metric1: SchemaConfig<METRIC_TYPES.AVG> = {
      accessor: 0,
      label: '',
      format: {
        id: undefined,
        params: undefined,
      },
      params: {},
      aggType: METRIC_TYPES.AVG,
    };

    const visSchemas: Schemas = {
      [metricKey]: [metric1],
      [bucketKey]: [],
    };
    mockConvertBucketToColumns.mockReturnValueOnce([null]);

    expect(getBucketColumns(visType, visSchemas, keys, dataView, false, [])).toBeNull();
    expect(mockConvertBucketToColumns).toBeCalledTimes(1);
  });
  test('should return columns', () => {
    const metricKey = 'metric';
    const bucketKey = 'group';
    const keys = [metricKey, bucketKey];

    const metric1: SchemaConfig<METRIC_TYPES.AVG> = {
      accessor: 0,
      label: '',
      format: {
        id: undefined,
        params: undefined,
      },
      params: {},
      aggType: METRIC_TYPES.AVG,
    };

    const column: AvgColumn = {
      sourceField: 'some-field',
      columnId: 'col3',
      operationType: 'average',
      isBucketed: false,
      isSplit: false,
      dataType: 'string',
      params: {},
      meta: { aggId: 'some id' },
    };

    const visSchemas: Schemas = {
      [metricKey]: [metric1],
      [bucketKey]: [metric1],
    };

    const returnValue = [column];

    mockConvertBucketToColumns.mockReturnValue(returnValue);

    expect(getBucketColumns(visType, visSchemas, keys, dataView, false, [])).toEqual([
      ...returnValue,
      ...returnValue,
    ]);
    expect(mockConvertBucketToColumns).toBeCalledTimes(2);
  });
});

describe('isValidVis', () => {
  const metricKey = 'metric';
  const bucketKey = 'group';

  test("should return true, if metrics doesn't contain sibling aggs", () => {
    const metric1: SchemaConfig<METRIC_TYPES.AVG> = {
      accessor: 0,
      label: '',
      format: {
        id: undefined,
        params: undefined,
      },
      params: {},
      aggType: METRIC_TYPES.AVG,
    };

    const visSchemas: Schemas = {
      [metricKey]: [metric1],
      [bucketKey]: [],
    };

    expect(isValidVis(visSchemas)).toBeTruthy();
  });

  test('should return true, if metrics contain only one sibling agg', () => {
    const metric1: SchemaConfig<METRIC_TYPES.AVG_BUCKET> = {
      accessor: 0,
      label: '',
      format: {
        id: undefined,
        params: undefined,
      },
      params: {},
      aggType: METRIC_TYPES.AVG_BUCKET,
    };

    const visSchemas: Schemas = {
      [metricKey]: [metric1],
      [bucketKey]: [],
    };

    expect(isValidVis(visSchemas)).toBeTruthy();
  });

  test('should return true, if metrics contain multiple sibling aggs of the same type', () => {
    const metric1: SchemaConfig<METRIC_TYPES.AVG_BUCKET> = {
      accessor: 0,
      label: '',
      format: {
        id: undefined,
        params: undefined,
      },
      params: {},
      aggType: METRIC_TYPES.AVG_BUCKET,
    };

    const visSchemas: Schemas = {
      [metricKey]: [metric1, metric1],
      [bucketKey]: [],
    };

    expect(isValidVis(visSchemas)).toBeTruthy();
  });

  test('should return false, if metrics contain multiple sibling aggs with different types', () => {
    const metric1: SchemaConfig<METRIC_TYPES.AVG_BUCKET> = {
      accessor: 0,
      label: '',
      format: {
        id: undefined,
        params: undefined,
      },
      params: {},
      aggType: METRIC_TYPES.AVG_BUCKET,
    };
    const metric2: SchemaConfig<METRIC_TYPES.SUM_BUCKET> = {
      accessor: 0,
      label: '',
      format: {
        id: undefined,
        params: undefined,
      },
      params: {},
      aggType: METRIC_TYPES.SUM_BUCKET,
    };

    const visSchemas: Schemas = {
      [metricKey]: [metric1, metric2],
      [bucketKey]: [],
    };

    expect(isValidVis(visSchemas)).toBeFalsy();
  });
});

describe('getMetricsWithoutDuplicates', () => {
  const duplicatedAggId = 'some-agg-id';
  const baseMetric = {
    accessor: 0,
    label: '',
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
  };

  const metric1: SchemaConfig<METRIC_TYPES.AVG> = {
    ...baseMetric,
    aggType: METRIC_TYPES.AVG,
    aggId: duplicatedAggId,
  };

  const metric2: SchemaConfig<METRIC_TYPES.SUM> = {
    ...baseMetric,
    aggType: METRIC_TYPES.SUM,
    aggId: 'some-other-id',
  };

  const metric3: SchemaConfig<METRIC_TYPES.MAX> = {
    ...baseMetric,
    aggType: METRIC_TYPES.MAX,
    aggId: duplicatedAggId,
  };

  test('should remove aggs with same aggIds', () => {
    expect(getMetricsWithoutDuplicates([metric1, metric2, metric3])).toEqual([metric1, metric2]);
  });

  test('should return array if no duplicates', () => {
    expect(getMetricsWithoutDuplicates([metric2, metric3])).toEqual([metric2, metric3]);
  });
});

describe('sortColumns', () => {
  const aggId1 = '0_agg_id';
  const aggId2 = '1_agg_id';
  const aggId3 = '2_agg_id';
  const aggId4 = '3_agg_id';
  const aggId5 = '4_agg_id';

  const column1: AvgColumn = {
    sourceField: 'some-field',
    columnId: 'col0',
    operationType: 'average',
    isBucketed: false,
    isSplit: false,
    dataType: 'string',
    params: {},
    meta: { aggId: aggId1 },
  };

  const column2: CountColumn = {
    sourceField: 'document',
    columnId: 'col1',
    operationType: 'count',
    isBucketed: false,
    isSplit: false,
    dataType: 'string',
    params: {},
    meta: { aggId: aggId2 },
  };

  const column3: MaxColumn = {
    sourceField: 'some-field',
    columnId: 'col2',
    operationType: 'max',
    isBucketed: false,
    isSplit: false,
    dataType: 'string',
    params: {},
    meta: { aggId: aggId3 },
  };

  const column4: DateHistogramColumn = {
    sourceField: 'some-field',
    columnId: 'col3',
    operationType: 'date_histogram',
    isBucketed: false,
    isSplit: false,
    dataType: 'string',
    params: { interval: '1h' },
    meta: { aggId: aggId4 },
  };

  const column5: DateHistogramColumn = {
    sourceField: 'some-field',
    columnId: 'col4',
    operationType: 'date_histogram',
    isBucketed: false,
    isSplit: false,
    dataType: 'string',
    params: { interval: '1h' },
    meta: { aggId: aggId5 },
  };

  const metricKey = 'metric';
  const bucketKey = 'group';

  const baseMetric = {
    accessor: 0,
    label: '',
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
  };
  const metric1: SchemaConfig<METRIC_TYPES.AVG> = {
    ...baseMetric,
    accessor: 1,
    aggType: METRIC_TYPES.AVG,
    aggId: aggId1,
  };
  const metric2: SchemaConfig<METRIC_TYPES.COUNT> = {
    ...baseMetric,
    accessor: 2,
    aggType: METRIC_TYPES.COUNT,
    aggId: aggId2,
  };
  const metric3: SchemaConfig<METRIC_TYPES.MAX> = {
    ...baseMetric,
    accessor: 3,
    aggType: METRIC_TYPES.MAX,
    aggId: aggId3,
  };

  const bucket1: SchemaConfig<BUCKET_TYPES.DATE_HISTOGRAM> = {
    ...baseMetric,
    accessor: 4,
    aggType: BUCKET_TYPES.DATE_HISTOGRAM,
    aggId: aggId4,
  };

  const bucket2: SchemaConfig<BUCKET_TYPES.DATE_HISTOGRAM> = {
    ...baseMetric,
    accessor: 5,
    aggType: BUCKET_TYPES.DATE_HISTOGRAM,
    aggId: aggId5,
  };

  const visSchemas: Schemas = {
    [metricKey]: [metric1, metric2, metric3],
    [bucketKey]: [bucket1, bucket2],
  };
  const columns: AggBasedColumn[] = [column4, column3, column2, column5, column1];
  const metricsWithoutDuplicates: Array<SchemaConfig<SupportedAggregation>> = [
    metric1,
    metric2,
    metric3,
  ];
  const keys = [bucketKey];

  test('should remove aggs with same aggIds', () => {
    expect(sortColumns(columns, visSchemas, keys, metricsWithoutDuplicates)).toEqual([
      column1,
      column2,
      column3,
      column4,
      column5,
    ]);
  });
});

describe('getColumnIds', () => {
  const visType = 'heatmap';

  const colId1 = '0_agg_id';
  const colId2 = '1_agg_id';
  const colId3 = '2_agg_id';
  const colId4 = '3_agg_id';

  const column1: AvgColumn = {
    sourceField: 'some-field',
    columnId: colId1,
    operationType: 'average',
    isBucketed: false,
    isSplit: false,
    dataType: 'string',
    params: {},
    meta: { aggId: colId1 },
  };

  const column2: CountColumn = {
    sourceField: 'document',
    columnId: colId2,
    operationType: 'count',
    isBucketed: false,
    isSplit: false,
    dataType: 'string',
    params: {},
    meta: { aggId: colId2 },
  };

  const column3: MaxColumn = {
    sourceField: 'some-field',
    columnId: colId3,
    operationType: 'max',
    isBucketed: false,
    isSplit: false,
    dataType: 'string',
    params: {},
    meta: { aggId: colId3 },
  };

  const column4: DateHistogramColumn = {
    sourceField: 'some-field',
    columnId: colId4,
    operationType: 'date_histogram',
    isBucketed: false,
    isSplit: false,
    dataType: 'string',
    params: { interval: '1h' },
    meta: { aggId: colId4 },
  };

  test('return columnIds', () => {
    expect(getColumnIds([column1, column2, column3, column4])).toEqual([
      colId1,
      colId2,
      colId3,
      colId4,
    ]);
  });

  describe('getCustomBucketColumns', () => {
    const dataView = stubLogstashDataView;
    const baseMetric = {
      accessor: 0,
      label: '',
      format: {
        id: undefined,
        params: undefined,
      },
      params: {},
    };
    const metric1: SchemaConfig<METRIC_TYPES.COUNT> = {
      ...baseMetric,
      accessor: 2,
      aggType: METRIC_TYPES.COUNT,
      aggId: '3',
    };
    const metric2: SchemaConfig<METRIC_TYPES.MAX> = {
      ...baseMetric,
      accessor: 3,
      aggType: METRIC_TYPES.MAX,
      aggId: '4',
    };
    const customBucketsWithMetricIds = [
      {
        customBucket: {} as IAggConfig,
        metricIds: ['3', '4'],
      },
      {
        customBucket: {} as IAggConfig,
        metricIds: ['5'],
      },
    ];
    test('return custom buckets columns and map', () => {
      mockConvertBucketToColumns.mockReturnValueOnce({
        columnId: 'col-1',
        operationType: 'date_histogram',
      });
      mockConvertBucketToColumns.mockReturnValueOnce({
        columnId: 'col-2',
        operationType: 'terms',
      });
      expect(
        getCustomBucketColumns(
          visType,
          customBucketsWithMetricIds,
          [
            { columnId: 'col-3', meta: { aggId: '3' } },
            { columnId: 'col-4', meta: { aggId: '4' } },
            { columnId: 'col-5', meta: { aggId: '5' } },
          ] as AggBasedColumn[],
          dataView,
          [metric1, metric2]
        )
      ).toEqual({
        customBucketColumns: [
          {
            columnId: 'col-1',
            operationType: 'date_histogram',
          },
          {
            columnId: 'col-2',
            operationType: 'terms',
          },
        ],
        customBucketsMap: {
          'col-3': 'col-1',
          'col-4': 'col-1',
          'col-5': 'col-2',
        },
      });
    });
  });
});
