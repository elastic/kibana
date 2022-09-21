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
  getFieldNameFromField,
  getLabel,
  getLabelForPercentile,
  getValidColumns,
  isColumnWithMeta,
  isSchemaConfig,
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
