/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { DatatableColumn } from '@kbn/expressions-plugin';
import { createMockVisData } from '../mocks';
import { getSplitDimensionAccessor } from './get_split_dimension_accessor';
import { BucketColumns } from '../../common/types';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';

describe('getSplitDimensionAccessor', () => {
  const visData = createMockVisData();

  const preparedFormatter1 = jest.fn((...args) => fieldFormatsMock.deserialize(...args));
  const preparedFormatter2 = jest.fn((...args) => fieldFormatsMock.deserialize(...args));
  const defaultFormatter = jest.fn((...args) => fieldFormatsMock.deserialize(...args));

  beforeEach(() => {
    defaultFormatter.mockClear();
    preparedFormatter1.mockClear();
    preparedFormatter2.mockClear();
  });

  const formatters: Record<string, any> = {
    [visData.columns[0].id]: preparedFormatter1(),
    [visData.columns[1].id]: preparedFormatter2(),
  };

  const splitDimension: ExpressionValueVisDimension = {
    type: 'vis_dimension',
    accessor: {
      id: visData.columns[1].id,
      name: visData.columns[1].name,
      meta: visData.columns[1].meta,
    },
    format: {
      params: {},
    },
  };

  it('returns accessor which is using formatter from formatters, if meta.params are present at accessing column', () => {
    const accessor = getSplitDimensionAccessor(
      visData.columns,
      splitDimension,
      formatters,
      defaultFormatter
    );
    const formatter = formatters[visData.columns[1].id];
    const spyOnFormatterConvert = jest.spyOn(formatter, 'convert');

    expect(defaultFormatter).toHaveBeenCalledTimes(0);
    expect(typeof accessor).toBe('function');
    accessor(visData.rows[0]);
    expect(spyOnFormatterConvert).toHaveBeenCalledTimes(1);
  });

  it('returns accessor which is using default formatter, if meta.params are not present and format is present at accessing column', () => {
    const column: Partial<BucketColumns> = {
      ...visData.columns[1],
      meta: { type: 'string' },
      format: {
        id: 'string',
        params: {},
      },
    };
    const columns = [visData.columns[0], column, visData.columns[2]] as DatatableColumn[];
    const defaultFormatterReturnedVal = fieldFormatsMock.deserialize();
    const spyOnDefaultFormatterConvert = jest.spyOn(defaultFormatterReturnedVal, 'convert');

    defaultFormatter.mockReturnValueOnce(defaultFormatterReturnedVal);

    const accessor = getSplitDimensionAccessor(
      columns,
      splitDimension,
      formatters,
      defaultFormatter
    );

    expect(defaultFormatter).toHaveBeenCalledTimes(1);
    expect(defaultFormatter).toHaveBeenCalledWith(column.format);

    expect(typeof accessor).toBe('function');
    accessor(visData.rows[0]);
    expect(spyOnDefaultFormatterConvert).toHaveBeenCalledTimes(1);
  });

  it('returns accessor which is using default formatter, if meta.params and format are not present', () => {
    const column: Partial<BucketColumns> = {
      ...visData.columns[1],
      meta: { type: 'string' },
    };
    const columns = [visData.columns[0], column, visData.columns[2]] as DatatableColumn[];
    const defaultFormatterReturnedVal = fieldFormatsMock.deserialize();
    const spyOnDefaultFormatterConvert = jest.spyOn(defaultFormatterReturnedVal, 'convert');

    defaultFormatter.mockReturnValueOnce(defaultFormatterReturnedVal);

    const accessor = getSplitDimensionAccessor(
      columns,
      splitDimension,
      formatters,
      defaultFormatter
    );

    expect(defaultFormatter).toHaveBeenCalledTimes(1);
    expect(defaultFormatter).toHaveBeenCalledWith();

    expect(typeof accessor).toBe('function');
    accessor(visData.rows[0]);
    expect(spyOnDefaultFormatterConvert).toHaveBeenCalledTimes(1);
  });

  it('returns accessor which returns undefined, if such column is not present', () => {
    const accessor1 = getSplitDimensionAccessor(
      visData.columns,
      splitDimension,
      formatters,
      defaultFormatter
    );

    expect(typeof accessor1).toBe('function');
    const result1 = accessor1({});
    expect(result1).toBeUndefined();

    const column2: Partial<BucketColumns> = {
      ...visData.columns[1],
      meta: { type: 'string' },
    };
    const columns2 = [visData.columns[0], column2, visData.columns[2]] as DatatableColumn[];
    const accessor2 = getSplitDimensionAccessor(
      columns2,
      splitDimension,
      formatters,
      defaultFormatter
    );

    expect(typeof accessor2).toBe('function');
    const result2 = accessor1({});
    expect(result2).toBeUndefined();

    const column3: Partial<BucketColumns> = {
      ...visData.columns[1],
      meta: { type: 'string' },
      format: {
        id: 'string',
        params: {},
      },
    };
    const columns3 = [visData.columns[0], column3, visData.columns[2]] as DatatableColumn[];

    const accessor3 = getSplitDimensionAccessor(
      columns3,
      splitDimension,
      formatters,
      defaultFormatter
    );
    expect(typeof accessor3).toBe('function');
    const result3 = accessor3({});
    expect(result3).toBeUndefined();
  });
});
