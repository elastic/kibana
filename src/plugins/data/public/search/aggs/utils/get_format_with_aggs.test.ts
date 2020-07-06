/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { identity } from 'lodash';

import { SerializedFieldFormat } from '../../../../../expressions/common/types';
import { FieldFormat } from '../../../../common';
import { IFieldFormat } from '../../../../public';

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
