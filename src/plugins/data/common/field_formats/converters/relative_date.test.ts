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

import moment from 'moment-timezone';
import { RelativeDateFormat } from './relative_date';

describe('Relative Date Format', () => {
  let convert: Function;

  beforeEach(() => {
    const relativeDate = new RelativeDateFormat({}, jest.fn());
    convert = relativeDate.convert.bind(relativeDate);
  });

  test('decoding an undefined or null date should return a "-"', () => {
    expect(convert(null)).toBe('-');
    expect(convert(undefined)).toBe('-');
  });

  test('decoding invalid date should echo invalid value', () => {
    expect(convert('not a valid date')).toBe('not a valid date');
  });

  test('should parse date values', () => {
    const val = '2017-08-13T20:24:09.904Z';
    expect(convert(val)).toBe(moment(val).fromNow());
  });
});
