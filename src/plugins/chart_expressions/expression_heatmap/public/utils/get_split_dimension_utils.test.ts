/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import type { DatatableColumn, Datatable } from '@kbn/expressions-plugin/public';
import type { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import { getSplitDimensionAccessor, createSplitPoint } from './get_split_dimension_utils';

const data: Datatable = {
  type: 'datatable',
  rows: [
    { 'col-0-1': 0, 'col-1-2': 'a', 'col-2-3': 'd' },
    { 'col-0-1': 148, 'col-1-2': 'b', 'col-2-3': 'c' },
  ],
  columns: [
    { id: 'col-0-1', name: 'Count', meta: { type: 'number' } },
    { id: 'col-1-2', name: 'Dest', meta: { type: 'string' } },
    {
      id: 'col-2-3',
      name: 'Test',
      meta: {
        type: 'number',
        params: {
          id: 'number',
        },
      },
    },
  ],
};

describe('getSplitDimensionAccessor', () => {
  const defaultFormatter = jest.fn((...args) => fieldFormatsMock.deserialize(...args));

  beforeEach(() => {
    defaultFormatter.mockClear();
  });

  const splitDimension: ExpressionValueVisDimension = {
    type: 'vis_dimension',
    accessor: {
      id: data.columns[2].id,
      name: data.columns[2].name,
      meta: data.columns[2].meta,
    },
    format: {
      params: {},
    },
  };

  it('returns accessor which is using formatter, if meta.params are present at accessing column', () => {
    const accessor = getSplitDimensionAccessor(data.columns, splitDimension, defaultFormatter);

    expect(defaultFormatter).toHaveBeenCalledTimes(1);
    expect(typeof accessor).toBe('function');
    accessor(data.rows[0]);
  });

  it('returns accessor which is using default formatter, if meta.params and format are not present', () => {
    const column: Partial<DatatableColumn> = {
      ...data.columns[2],
      meta: { type: 'number' },
    };
    const columns = [data.columns[0], column, data.columns[2]] as DatatableColumn[];
    const defaultFormatterReturnedVal = fieldFormatsMock.deserialize();
    const spyOnDefaultFormatterConvert = jest.spyOn(defaultFormatterReturnedVal, 'convert');

    defaultFormatter.mockReturnValueOnce(defaultFormatterReturnedVal);
    const accessor = getSplitDimensionAccessor(columns, splitDimension, defaultFormatter);

    expect(defaultFormatter).toHaveBeenCalledTimes(1);

    expect(typeof accessor).toBe('function');
    accessor(data.rows[0]);
    expect(spyOnDefaultFormatterConvert).toHaveBeenCalledTimes(1);
  });

  it('returns accessor which returns undefined, if such column is not present', () => {
    const accessor1 = getSplitDimensionAccessor(data.columns, splitDimension, defaultFormatter);

    expect(typeof accessor1).toBe('function');
    const result1 = accessor1({});
    expect(result1).toBeUndefined();

    const column2: Partial<DatatableColumn> = {
      ...data.columns[2],
      meta: { type: 'string' },
    };
    const columns2 = [data.columns[0], data.columns[1], column2] as DatatableColumn[];
    const accessor2 = getSplitDimensionAccessor(columns2, splitDimension, defaultFormatter);

    expect(typeof accessor2).toBe('function');
    const result2 = accessor1({});
    expect(result2).toBeUndefined();

    const column3 = {
      ...data.columns[2],
      meta: { type: 'string' },
      format: {
        id: 'string',
        params: {},
      },
    };
    const columns3 = [data.columns[0], data.columns[1], column3] as DatatableColumn[];

    const accessor3 = getSplitDimensionAccessor(columns3, splitDimension, defaultFormatter);
    expect(typeof accessor3).toBe('function');
    const result3 = accessor3({});
    expect(result3).toBeUndefined();
  });
});

describe('createSplitPoint', () => {
  const defaultFormatter = jest.fn((...args) => fieldFormatsMock.deserialize(...args));

  beforeEach(() => {
    defaultFormatter.mockClear();
  });

  const splitDimension: ExpressionValueVisDimension = {
    type: 'vis_dimension',
    accessor: {
      id: data.columns[2].id,
      name: data.columns[2].name,
      meta: data.columns[2].meta,
    },
    format: {
      params: {},
    },
  };

  it('returns point if value is found in the table', () => {
    const point = createSplitPoint(splitDimension, 'c', defaultFormatter, data);

    expect(defaultFormatter).toHaveBeenCalledTimes(1);
    expect(point).toStrictEqual({ column: 2, row: 1, value: 'c', table: data });
  });

  it('returns undefined if value is not found in the table', () => {
    const point = createSplitPoint(splitDimension, 'test', defaultFormatter, data);

    expect(defaultFormatter).toHaveBeenCalledTimes(1);
    expect(point).toBeUndefined();
  });
});
