/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { IAggConfig, METRIC_TYPES } from '@kbn/data-plugin/common';
import { AggBasedColumn, ColumnWithMeta, Operations } from '../..';
import { SchemaConfig } from '../../types';
import {
  getCustomBucketsFromSiblingAggs,
  getFieldNameFromField,
  getLabel,
  getLabelForPercentile,
  getMetricFromParentPipelineAgg,
  getValidColumns,
  isColumnWithMeta,
  isMetricAggWithoutParams,
  isPercentileAgg,
  isPercentileRankAgg,
  isPipeline,
  isSchemaConfig,
  isSiblingPipeline,
  isStdDevAgg,
} from './utils';

describe('getLabel', () => {
  const label = 'some label';
  const customLabel = 'some custom label';

  const agg: SchemaConfig<METRIC_TYPES.AVG> = {
    accessor: 0,
    label,
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
    aggType: METRIC_TYPES.AVG,
    aggId: 'id',
    aggParams: { field: 'some-field' },
  };

  test('should return label', () => {
    const { aggParams, ...aggWithoutAggParams } = agg;
    expect(getLabel(aggWithoutAggParams)).toEqual(label);
    expect(getLabel(agg)).toEqual(label);
    expect(getLabel({ ...agg, aggParams: { ...aggParams!, customLabel: undefined } })).toEqual(
      label
    );
  });

  test('should return customLabel', () => {
    const aggParams = { ...agg.aggParams!, customLabel };
    const aggWithCustomLabel = { ...agg, aggParams };
    expect(getLabel(aggWithCustomLabel)).toEqual(customLabel);
  });
});

describe('getLabelForPercentile', () => {
  const label = 'some label';
  const customLabel = 'some custom label';

  const agg: SchemaConfig<METRIC_TYPES.PERCENTILES> = {
    accessor: 0,
    label,
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
    aggType: METRIC_TYPES.PERCENTILES,
    aggId: 'id',
    aggParams: { field: 'some-field' },
  };

  test('should return empty string if no custom label is specified', () => {
    const { aggParams, ...aggWithoutAggParams } = agg;
    expect(getLabelForPercentile(aggWithoutAggParams)).toEqual('');
    expect(getLabel({ ...agg, aggParams: { ...aggParams!, customLabel: '' } })).toEqual('');
  });

  test('should return label if custom label is specified', () => {
    const aggParams = { ...agg.aggParams!, customLabel };
    const aggWithCustomLabel = { ...agg, aggParams };
    expect(getLabelForPercentile(aggWithCustomLabel)).toEqual(label);
  });
});

describe('getValidColumns', () => {
  const dataView = stubLogstashDataView;
  const columns: AggBasedColumn[] = [
    {
      operationType: Operations.AVERAGE,
      sourceField: dataView.fields[0].name,
      columnId: 'some-id-0',
      dataType: 'number',
      params: {},
      meta: { aggId: 'aggId-0' },
      isSplit: false,
      isBucketed: true,
    },
    {
      operationType: Operations.SUM,
      sourceField: dataView.fields[0].name,
      columnId: 'some-id-1',
      dataType: 'number',
      params: {},
      meta: { aggId: 'aggId-1' },
      isSplit: false,
      isBucketed: true,
    },
  ];
  test.each<[string, Parameters<typeof getValidColumns>, AggBasedColumn[] | null]>([
    ['null if array contains null', [[null, ...columns]], null],
    ['null if columns is null', [null], null],
    ['null if columns is undefined', [undefined], null],
    ['columns', [columns], columns],
    ['columns if one column is passed', [columns[0]], [columns[0]]],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(getValidColumns(...input)).toBeNull();
    } else {
      expect(getValidColumns(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});

describe('getFieldNameFromField', () => {
  test('should return null if no field is passed', () => {
    expect(getFieldNameFromField(undefined)).toBeNull();
  });

  test('should return field name if field is string', () => {
    const fieldName = 'some-field-name';
    expect(getFieldNameFromField(fieldName)).toEqual(fieldName);
  });

  test('should return field name if field is DataViewField', () => {
    const field = stubLogstashDataView.fields[0];
    expect(getFieldNameFromField(field)).toEqual(field.name);
  });
});

describe('isSchemaConfig', () => {
  const iAggConfig = {
    id: '',
    enabled: false,
    params: {},
  } as IAggConfig;

  const schemaConfig: SchemaConfig<METRIC_TYPES.AVG> = {
    accessor: 0,
    label: '',
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
    aggType: METRIC_TYPES.AVG,
  };

  test('should be false if is IAggConfig', () => {
    expect(isSchemaConfig(iAggConfig)).toBeFalsy();
  });

  test('should be false if is SchemaConfig', () => {
    expect(isSchemaConfig(schemaConfig)).toBeTruthy();
  });
});

describe('isColumnWithMeta', () => {
  const column: AggBasedColumn = {
    sourceField: '',
    columnId: '',
    operationType: 'terms',
    isBucketed: false,
    isSplit: false,
    dataType: 'string',
  } as AggBasedColumn;

  const columnWithMeta: ColumnWithMeta = {
    sourceField: '',
    columnId: '',
    operationType: 'average',
    isBucketed: false,
    isSplit: false,
    dataType: 'string',
    params: {},
    meta: { aggId: 'some-agg-id' },
  };

  test('should return false if column without meta', () => {
    expect(isColumnWithMeta(column)).toBeFalsy();
  });

  test('should return true if column with meta', () => {
    expect(isColumnWithMeta(columnWithMeta)).toBeTruthy();
  });
});

describe('isSiblingPipeline', () => {
  const metric: Omit<SchemaConfig, 'aggType'> = {
    accessor: 0,
    label: '',
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
  };

  test.each<[METRIC_TYPES, boolean]>([
    [METRIC_TYPES.AVG_BUCKET, true],
    [METRIC_TYPES.SUM_BUCKET, true],
    [METRIC_TYPES.MAX_BUCKET, true],
    [METRIC_TYPES.MIN_BUCKET, true],
    [METRIC_TYPES.CUMULATIVE_SUM, false],
  ])('for %s should return %s', (aggType, expected) => {
    expect(isSiblingPipeline({ ...metric, aggType } as SchemaConfig<typeof aggType>)).toBe(
      expected
    );
  });
});

describe('isPipeline', () => {
  const metric: Omit<SchemaConfig, 'aggType'> = {
    accessor: 0,
    label: '',
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
  };

  test.each<[METRIC_TYPES, boolean]>([
    [METRIC_TYPES.AVG_BUCKET, true],
    [METRIC_TYPES.SUM_BUCKET, true],
    [METRIC_TYPES.MAX_BUCKET, true],
    [METRIC_TYPES.MIN_BUCKET, true],
    [METRIC_TYPES.CUMULATIVE_SUM, true],
    [METRIC_TYPES.DERIVATIVE, true],
    [METRIC_TYPES.MOVING_FN, true],
    [METRIC_TYPES.AVG, false],
  ])('for %s should return %s', (aggType, expected) => {
    expect(isPipeline({ ...metric, aggType } as SchemaConfig<typeof aggType>)).toBe(expected);
  });
});

describe('isMetricAggWithoutParams', () => {
  const metric: Omit<SchemaConfig, 'aggType'> = {
    accessor: 0,
    label: '',
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
  };

  test.each<[METRIC_TYPES, boolean]>([
    [METRIC_TYPES.AVG, true],
    [METRIC_TYPES.COUNT, true],
    [METRIC_TYPES.MAX, true],
    [METRIC_TYPES.MIN, true],
    [METRIC_TYPES.SUM, true],
    [METRIC_TYPES.MEDIAN, true],
    [METRIC_TYPES.CARDINALITY, true],
    [METRIC_TYPES.VALUE_COUNT, true],
    [METRIC_TYPES.DERIVATIVE, false],
  ])('for %s should return %s', (aggType, expected) => {
    expect(isMetricAggWithoutParams({ ...metric, aggType } as SchemaConfig<typeof aggType>)).toBe(
      expected
    );
  });
});

describe('isPercentileAgg', () => {
  const metric: Omit<SchemaConfig, 'aggType'> = {
    accessor: 0,
    label: '',
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
  };

  test.each<[METRIC_TYPES, boolean]>([
    [METRIC_TYPES.PERCENTILES, true],
    [METRIC_TYPES.DERIVATIVE, false],
  ])('for %s should return %s', (aggType, expected) => {
    expect(isPercentileAgg({ ...metric, aggType } as SchemaConfig<typeof aggType>)).toBe(expected);
  });
});

describe('isPercentileRankAgg', () => {
  const metric: Omit<SchemaConfig, 'aggType'> = {
    accessor: 0,
    label: '',
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
  };

  test.each<[METRIC_TYPES, boolean]>([
    [METRIC_TYPES.PERCENTILE_RANKS, true],
    [METRIC_TYPES.PERCENTILES, false],
  ])('for %s should return %s', (aggType, expected) => {
    expect(isPercentileRankAgg({ ...metric, aggType } as SchemaConfig<typeof aggType>)).toBe(
      expected
    );
  });
});

describe('isStdDevAgg', () => {
  const metric: Omit<SchemaConfig, 'aggType'> = {
    accessor: 0,
    label: '',
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
  };

  test.each<[METRIC_TYPES, boolean]>([
    [METRIC_TYPES.STD_DEV, true],
    [METRIC_TYPES.PERCENTILES, false],
  ])('for %s should return %s', (aggType, expected) => {
    expect(isStdDevAgg({ ...metric, aggType } as SchemaConfig<typeof aggType>)).toBe(expected);
  });
});

describe('getCustomBucketsFromSiblingAggs', () => {
  const bucket1 = {
    id: 'some-id',
    params: { type: 'some-type' },
    type: 'type1',
    enabled: true,
  } as unknown as IAggConfig;
  const serialize1 = () => bucket1;

  const bucket2 = {
    id: 'some-id-1',
    params: { type: 'some-type-1' },
    type: 'type2',
    enabled: false,
  } as unknown as IAggConfig;
  const serialize2 = () => bucket2;

  const bucketWithSerialize1 = { ...bucket1, serialize: serialize1 } as unknown as IAggConfig;
  const metric1: SchemaConfig<METRIC_TYPES.AVG_BUCKET> = {
    accessor: 0,
    label: '',
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
    aggType: METRIC_TYPES.AVG_BUCKET,
    aggId: 'some-agg-id-1',
    aggParams: {
      customBucket: bucketWithSerialize1,
    },
  };

  const bucketWithSerialize2 = { ...bucket2, serialize: serialize2 } as unknown as IAggConfig;
  const metric2: SchemaConfig<METRIC_TYPES.AVG_BUCKET> = {
    accessor: 0,
    label: '',
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
    aggType: METRIC_TYPES.AVG_BUCKET,
    aggId: 'some-agg-id-2',
    aggParams: {
      customBucket: bucketWithSerialize2,
    },
  };
  const bucket3 = { ...bucket1, id: 'other id' } as unknown as IAggConfig;
  const serialize3 = () => bucket3;

  const bucketWithSerialize3 = { ...bucket3, serialize: serialize3 } as unknown as IAggConfig;
  const metric3: SchemaConfig<METRIC_TYPES.AVG_BUCKET> = {
    accessor: 0,
    label: '',
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
    aggType: METRIC_TYPES.AVG_BUCKET,
    aggId: 'some-agg-id-3',
    aggParams: {
      customBucket: bucketWithSerialize3,
    },
  };

  test("should filter out duplicated custom buckets, ignoring id's", () => {
    expect(getCustomBucketsFromSiblingAggs([metric1, metric2, metric3])).toEqual([
      { customBucket: bucketWithSerialize1, metricIds: ['some-agg-id-1', 'some-agg-id-3'] },
      { customBucket: bucketWithSerialize2, metricIds: ['some-agg-id-2'] },
    ]);
  });
});

const mockConvertToSchemaConfig = jest.fn();

jest.mock('../../vis_schemas', () => ({
  convertToSchemaConfig: jest.fn(() => mockConvertToSchemaConfig()),
}));

describe('getMetricFromParentPipelineAgg', () => {
  const metricAggId = 'agg-id-0';
  const aggId = 'agg-id-1';
  const plainAgg: SchemaConfig<METRIC_TYPES.AVG> = {
    accessor: 0,
    label: 'some-label',
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
    aggType: METRIC_TYPES.AVG,
    aggId: metricAggId,
  };
  const agg: SchemaConfig<METRIC_TYPES.AVG_BUCKET> = {
    accessor: 0,
    label: '',
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
    aggType: METRIC_TYPES.AVG_BUCKET,
    aggParams: { customMetric: {} as IAggConfig },
    aggId,
  };

  const parentPipelineAgg: SchemaConfig<METRIC_TYPES.CUMULATIVE_SUM> = {
    accessor: 0,
    label: '',
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
    aggType: METRIC_TYPES.CUMULATIVE_SUM,
    aggParams: { metricAgg: 'custom' },
    aggId,
  };

  const metric = { aggType: METRIC_TYPES.CUMULATIVE_SUM };
  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    mockConvertToSchemaConfig.mockReturnValue(metric);
  });

  test('should return null if aggParams are undefined', () => {
    expect(getMetricFromParentPipelineAgg({ ...agg, aggParams: undefined }, [])).toBeNull();
    expect(mockConvertToSchemaConfig).toBeCalledTimes(0);
  });

  test('should return null if is sibling pipeline agg and custom metric is not defined', () => {
    expect(
      getMetricFromParentPipelineAgg({ ...agg, aggParams: { customMetric: undefined } }, [])
    ).toBeNull();
    expect(mockConvertToSchemaConfig).toBeCalledTimes(0);
  });

  test('should return null if is parent pipeline agg, metricAgg is custom and custom metric is not defined', () => {
    expect(getMetricFromParentPipelineAgg(parentPipelineAgg, [])).toBeNull();
    expect(mockConvertToSchemaConfig).toBeCalledTimes(0);
  });

  test('should return metric if is parent pipeline agg, metricAgg is equal to aggId and custom metric is not defined', () => {
    const parentPipelineAggWithLink = {
      ...parentPipelineAgg,
      aggParams: {
        metricAgg: metricAggId,
      },
    };
    expect(
      getMetricFromParentPipelineAgg(parentPipelineAggWithLink, [
        parentPipelineAggWithLink,
        plainAgg,
      ])
    ).toEqual(plainAgg);
    expect(mockConvertToSchemaConfig).toBeCalledTimes(0);
  });

  test('should return metric if sibling pipeline agg with custom metric', () => {
    expect(getMetricFromParentPipelineAgg(agg, [agg])).toEqual(metric);
    expect(mockConvertToSchemaConfig).toBeCalledTimes(1);
  });

  test('should return metric if parent pipeline agg with custom metric', () => {
    expect(
      getMetricFromParentPipelineAgg(
        {
          ...parentPipelineAgg,
          aggParams: { ...parentPipelineAgg.aggParams, customMetric: {} as IAggConfig },
        },
        [agg]
      )
    ).toEqual(metric);
    expect(mockConvertToSchemaConfig).toBeCalledTimes(1);
  });
});
