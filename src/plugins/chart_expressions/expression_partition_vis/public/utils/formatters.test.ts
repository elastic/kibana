/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { Datatable } from '@kbn/expressions-plugin';
import { createMockVisData } from '../mocks';
import { generateFormatters, getAvailableFormatter, getFormatter } from './formatters';
import { BucketColumns } from '../../common/types';

describe('generateFormatters', () => {
  const visData = createMockVisData();
  const defaultFormatter = jest.fn((...args) => fieldFormatsMock.deserialize(...args));
  beforeEach(() => {
    defaultFormatter.mockClear();
  });

  it('returns formatters, if columns have meta parameters', () => {
    const formatters = generateFormatters(visData, defaultFormatter);
    const formattingResult = fieldFormatsMock.deserialize();

    const serializedFormatters = Object.keys(formatters).reduce(
      (serialized, formatterId) => ({
        ...serialized,
        [formatterId]: formatters[formatterId]?.toJSON(),
      }),
      {}
    );

    expect(serializedFormatters).toEqual({
      'col-0-2': formattingResult.toJSON(),
      'col-1-1': formattingResult.toJSON(),
      'col-2-3': formattingResult.toJSON(),
      'col-3-1': formattingResult.toJSON(),
    });

    expect(defaultFormatter).toHaveBeenCalledTimes(visData.columns.length);
    visData.columns.forEach((col) => {
      expect(defaultFormatter).toHaveBeenCalledWith(col.meta.params);
    });
  });

  it('returns undefined formatters for columns without meta parameters', () => {
    const newVisData: Datatable = {
      ...visData,
      columns: visData.columns.map(({ meta, ...col }) => ({ ...col, meta: { type: 'string' } })),
    };

    const formatters = generateFormatters(newVisData, defaultFormatter);

    expect(formatters).toEqual({
      'col-0-2': undefined,
      'col-1-1': undefined,
      'col-2-3': undefined,
      'col-3-1': undefined,
    });
    expect(defaultFormatter).toHaveBeenCalledTimes(0);
  });
});

describe('getAvailableFormatter', () => {
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

  it('returns formatter from formatters, if meta.params are present ', () => {
    const formatter = getAvailableFormatter(visData.columns[1], formatters, defaultFormatter);

    expect(formatter).toEqual(formatters[visData.columns[1].id]);
    expect(defaultFormatter).toHaveBeenCalledTimes(0);
  });

  it('returns formatter from defaultFormatter factory, if meta.params are not present and format is present at column', () => {
    const column: Partial<BucketColumns> = {
      ...visData.columns[1],
      meta: { type: 'string' },
      format: {
        id: 'string',
        params: {},
      },
    };
    const formatter = getAvailableFormatter(column, formatters, defaultFormatter);

    expect(formatter).not.toBeNull();
    expect(typeof formatter).toBe('object');
    expect(defaultFormatter).toHaveBeenCalledTimes(1);
    expect(defaultFormatter).toHaveBeenCalledWith(column.format);
  });

  it('returns undefined, if meta.params and format are not present', () => {
    const column: Partial<BucketColumns> = {
      ...visData.columns[1],
      meta: { type: 'string' },
    };
    const formatter = getAvailableFormatter(column, formatters, defaultFormatter);

    expect(formatter).toBeUndefined();
    expect(defaultFormatter).toHaveBeenCalledTimes(0);
  });
});

describe('getFormatter', () => {
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

  it('returns formatter from formatters, if meta.params are present ', () => {
    const formatter = getFormatter(visData.columns[1], formatters, defaultFormatter);

    expect(formatter).toEqual(formatters[visData.columns[1].id]);
    expect(defaultFormatter).toHaveBeenCalledTimes(0);
  });

  it('returns formatter from defaultFormatter factory, if meta.params are not present and format is present at column', () => {
    const column: Partial<BucketColumns> = {
      ...visData.columns[1],
      meta: { type: 'string' },
      format: {
        id: 'string',
        params: {},
      },
    };
    const formatter = getFormatter(column, formatters, defaultFormatter);

    expect(formatter).not.toBeNull();
    expect(typeof formatter).toBe('object');
    expect(defaultFormatter).toHaveBeenCalledTimes(1);
    expect(defaultFormatter).toHaveBeenCalledWith(column.format);
  });

  it('returns defaultFormatter, if meta.params and format are not present', () => {
    const column: Partial<BucketColumns> = {
      ...visData.columns[1],
      meta: { type: 'string' },
    };

    const formatter = getFormatter(column, formatters, defaultFormatter);

    expect(formatter).not.toBeNull();
    expect(typeof formatter).toBe('object');
    expect(defaultFormatter).toHaveBeenCalledTimes(1);
    expect(defaultFormatter).toHaveBeenCalledWith();
  });
});
