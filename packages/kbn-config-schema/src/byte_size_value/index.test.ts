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

import { ByteSizeValue } from '.';

describe('parsing units', () => {
  test('number string (bytes)', () => {
    expect(ByteSizeValue.parse('123').getValueInBytes()).toBe(123);
  });

  test('bytes', () => {
    expect(ByteSizeValue.parse('123b').getValueInBytes()).toBe(123);
  });

  test('kilobytes', () => {
    expect(ByteSizeValue.parse('1kb').getValueInBytes()).toBe(1024);
    expect(ByteSizeValue.parse('15kb').getValueInBytes()).toBe(15360);
  });

  test('megabytes', () => {
    expect(ByteSizeValue.parse('1mb').getValueInBytes()).toBe(1048576);
  });

  test('gigabytes', () => {
    expect(ByteSizeValue.parse('1gb').getValueInBytes()).toBe(1073741824);
  });

  test('throws an error when unsupported unit specified', () => {
    expect(() => ByteSizeValue.parse('1tb')).toThrowError('could not parse byte size value');
  });
});

describe('#constructor', () => {
  test('throws if number of bytes is negative', () => {
    expect(() => new ByteSizeValue(-1024)).toThrowErrorMatchingSnapshot();
  });

  test('throws if number of bytes is not safe', () => {
    expect(() => new ByteSizeValue(NaN)).toThrowErrorMatchingSnapshot();
    expect(() => new ByteSizeValue(Infinity)).toThrowErrorMatchingSnapshot();
    expect(() => new ByteSizeValue(Math.pow(2, 53))).toThrowErrorMatchingSnapshot();
  });

  test('accepts 0', () => {
    const value = new ByteSizeValue(0);
    expect(value.getValueInBytes()).toBe(0);
  });

  test('accepts safe positive integer', () => {
    const value = new ByteSizeValue(1024);
    expect(value.getValueInBytes()).toBe(1024);
  });
});

describe('#isGreaterThan', () => {
  test('handles true', () => {
    const a = ByteSizeValue.parse('2kb');
    const b = ByteSizeValue.parse('1kb');
    expect(a.isGreaterThan(b)).toBe(true);
  });

  test('handles false', () => {
    const a = ByteSizeValue.parse('2kb');
    const b = ByteSizeValue.parse('1kb');
    expect(b.isGreaterThan(a)).toBe(false);
  });
});

describe('#isLessThan', () => {
  test('handles true', () => {
    const a = ByteSizeValue.parse('2kb');
    const b = ByteSizeValue.parse('1kb');
    expect(b.isLessThan(a)).toBe(true);
  });

  test('handles false', () => {
    const a = ByteSizeValue.parse('2kb');
    const b = ByteSizeValue.parse('1kb');
    expect(a.isLessThan(b)).toBe(false);
  });
});

describe('#isEqualTo', () => {
  test('handles true', () => {
    const a = ByteSizeValue.parse('1kb');
    const b = ByteSizeValue.parse('1kb');
    expect(b.isEqualTo(a)).toBe(true);
  });

  test('handles false', () => {
    const a = ByteSizeValue.parse('2kb');
    const b = ByteSizeValue.parse('1kb');
    expect(a.isEqualTo(b)).toBe(false);
  });
});

describe('#toString', () => {
  test('renders to nearest lower unit by default', () => {
    expect(ByteSizeValue.parse('1b').toString()).toBe('1b');
    expect(ByteSizeValue.parse('10b').toString()).toBe('10b');
    expect(ByteSizeValue.parse('1023b').toString()).toBe('1023b');
    expect(ByteSizeValue.parse('1024b').toString()).toBe('1kb');
    expect(ByteSizeValue.parse('1025b').toString()).toBe('1kb');
    expect(ByteSizeValue.parse('1024kb').toString()).toBe('1mb');
    expect(ByteSizeValue.parse('1024mb').toString()).toBe('1gb');
    expect(ByteSizeValue.parse('1024gb').toString()).toBe('1024gb');
  });

  test('renders to specified unit', () => {
    expect(ByteSizeValue.parse('1024b').toString('b')).toBe('1024b');
    expect(ByteSizeValue.parse('1kb').toString('b')).toBe('1024b');
    expect(ByteSizeValue.parse('1mb').toString('kb')).toBe('1024kb');
    expect(ByteSizeValue.parse('1mb').toString('b')).toBe('1048576b');
    expect(ByteSizeValue.parse('512mb').toString('gb')).toBe('0.5gb');
  });
});
