/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { identity } from 'lodash';

import { SerializedFieldFormat } from 'src/plugins/expressions/common/types';
import { FieldFormat, IFieldFormat } from '../../../../common';

import { getFormatWithAggs } from './get_format_with_aggs';

describe('getFormatWithAggs', () => {
  let getFormat: jest.MockedFunction<(mapping: SerializedFieldFormat) => IFieldFormat>;

  beforeEach(() => {
    getFormat = jest.fn().mockImplementation(() => {
      const DefaultFieldFormat = FieldFormat.from(identity);
      return new DefaultFieldFormat();
    });
  });

  test('calls provided getFormat if no matching aggs exist', () => {
    const mapping = { id: 'foo', params: {} };
    const getFieldFormat = getFormatWithAggs(getFormat);
    getFieldFormat(mapping);

    expect(getFormat).toHaveBeenCalledTimes(1);
    expect(getFormat).toHaveBeenCalledWith(mapping);
  });

  test('creates custom format for date_range', () => {
    const mapping = { id: 'date_range', params: {} };
    const getFieldFormat = getFormatWithAggs(getFormat);
    const format = getFieldFormat(mapping);

    expect(format.convert({ from: '2020-05-01', to: '2020-06-01' })).toBe(
      '2020-05-01 to 2020-06-01'
    );
    expect(format.convert({ to: '2020-06-01' })).toBe('Before 2020-06-01');
    expect(format.convert({ from: '2020-06-01' })).toBe('After 2020-06-01');
    expect(getFormat).toHaveBeenCalledTimes(3);
  });

  test('creates custom format for ip_range', () => {
    const mapping = { id: 'ip_range', params: {} };
    const getFieldFormat = getFormatWithAggs(getFormat);
    const format = getFieldFormat(mapping);

    expect(format.convert({ type: 'range', from: '10.0.0.1', to: '10.0.0.10' })).toBe(
      '10.0.0.1 to 10.0.0.10'
    );
    expect(format.convert({ type: 'range', to: '10.0.0.10' })).toBe('-Infinity to 10.0.0.10');
    expect(format.convert({ type: 'range', from: '10.0.0.10' })).toBe('10.0.0.10 to Infinity');
    format.convert({ type: 'mask', mask: '10.0.0.1/24' });
    expect(getFormat).toHaveBeenCalledTimes(4);
  });

  test('creates custom format for range', () => {
    const mapping = { id: 'range', params: {} };
    const getFieldFormat = getFormatWithAggs(getFormat);
    const format = getFieldFormat(mapping);

    expect(format.convert({ gte: 1, lt: 20 })).toBe('≥ 1 and < 20');
    expect(getFormat).toHaveBeenCalledTimes(1);
  });

  test('creates alternative format for range using the template parameter', () => {
    const mapping = { id: 'range', params: { template: 'arrow_right' } };
    const getFieldFormat = getFormatWithAggs(getFormat);
    const format = getFieldFormat(mapping);

    expect(format.convert({ gte: 1, lt: 20 })).toBe('1 → 20');
    expect(getFormat).toHaveBeenCalledTimes(1);
  });

  test('handles Infinity values internally when no nestedFormatter is passed', () => {
    const mapping = { id: 'range', params: { replaceInfinity: true } };
    const getFieldFormat = getFormatWithAggs(getFormat);
    const format = getFieldFormat(mapping);

    expect(format.convert({ gte: -Infinity, lt: Infinity })).toBe('≥ −∞ and < +∞');
    expect(getFormat).toHaveBeenCalledTimes(1);
  });

  test('lets Infinity values handling to nestedFormatter even when flag is on', () => {
    const mapping = { id: 'range', params: { replaceInfinity: true, id: 'any' } };
    const getFieldFormat = getFormatWithAggs(getFormat);
    const format = getFieldFormat(mapping);

    expect(format.convert({ gte: -Infinity, lt: Infinity })).toBe('≥ -Infinity and < Infinity');
    expect(getFormat).toHaveBeenCalledTimes(1);
  });

  test('returns custom label for range if provided', () => {
    const mapping = { id: 'range', params: {} };
    const getFieldFormat = getFormatWithAggs(getFormat);
    const format = getFieldFormat(mapping);

    expect(format.convert({ gte: 1, lt: 20, label: 'custom' })).toBe('custom');
    // underlying formatter is not called because custom label can be used directly
    expect(getFormat).toHaveBeenCalledTimes(0);
  });

  test('creates custom format for terms', () => {
    const mapping = {
      id: 'terms',
      params: {
        otherBucketLabel: 'other bucket',
        missingBucketLabel: 'missing bucket',
      },
    };
    const getFieldFormat = getFormatWithAggs(getFormat);
    const format = getFieldFormat(mapping);

    expect(format.convert('machine.os.keyword')).toBe('machine.os.keyword');
    expect(format.convert('__other__')).toBe(mapping.params.otherBucketLabel);
    expect(format.convert('__missing__')).toBe(mapping.params.missingBucketLabel);
    expect(getFormat).toHaveBeenCalledTimes(3);
  });
});
