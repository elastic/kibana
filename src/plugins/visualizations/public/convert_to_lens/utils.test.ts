/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import {
  AggBasedColumn,
  CounterRateColumn,
  GenericColumnWithMeta,
  SchemaConfig,
  SupportedAggregation,
} from '../../common';
import { AvgColumn, CountColumn, Meta } from '../../common/convert_to_lens/lib';
import {
  getBucketCollapseFn,
  getBucketColumns,
  getColumnsWithoutReferenced,
  isReferenced,
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
    aggType: METRIC_TYPES.AVG_BUCKET,
  };

  const metric3: SchemaConfig<METRIC_TYPES.MAX_BUCKET> = {
    ...metric1,
    aggType: METRIC_TYPES.MAX_BUCKET,
  };

  const metric4: SchemaConfig<METRIC_TYPES.MIN_BUCKET> = {
    ...metric1,
    aggType: METRIC_TYPES.MIN_BUCKET,
  };

  const metric5: SchemaConfig<METRIC_TYPES.SUM_BUCKET> = {
    ...metric1,
    aggType: METRIC_TYPES.SUM_BUCKET,
  };

  test.each<[string, Array<SchemaConfig<SupportedAggregation>>, string | undefined]>([
    ['avg', [metric1, metric2], 'avg'],
    ['max', [metric1, metric3], 'max'],
    ['min', [metric1, metric4], 'min'],
    ['sum', [metric1, metric5], 'sum'],
    ['undefined if no sibling pipeline agg is provided', [metric1], undefined],
  ])('should return%s', (_, input, expected) => {
    expect(getBucketCollapseFn(input)).toEqual(expected);
  });
});

describe('getBucketColumns', () => {
  const dataView = stubLogstashDataView;

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

    expect(getBucketColumns(visSchemas, keys, dataView, false, [])).toEqual([]);
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

    expect(getBucketColumns(visSchemas, keys, dataView, false, [])).toBeNull();
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

    expect(getBucketColumns(visSchemas, keys, dataView, false, [])).toBeNull();
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

    expect(getBucketColumns(visSchemas, keys, dataView, false, [])).toEqual([
      ...returnValue,
      ...returnValue,
    ]);
    expect(mockConvertBucketToColumns).toBeCalledTimes(2);
  });
});
